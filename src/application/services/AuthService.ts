import { User } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { Login, RegisterDTO } from "../dtos/UserDTOs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

export class AuthService{
    constructor(
        private userRepo:IUserRepository,
        private jwtSecret:string ="default-jwt-secret"
    ){}

    async register(dto:RegisterDTO):Promise<Omit<User, 'passwordHash'>>{
        const register=await this.userRepo.findByUsername(dto.userName);
        if(register){
            throw new Error("USER_ALREAD_EXISTS");   
        }

        const passwordHash=await bcrypt.hash(dto.password,10);

        const newUser=await this.userRepo.create({
            userName:dto.userName,
            passwordHash:passwordHash,
            role:"USER",
            status:"ACTIVE"
        });
        const { passwordHash: _, ...safeUser } = newUser;

        return safeUser;
    }

    async login(dto:Login):Promise<{token:string,user:Omit<User,"passwordHash">}>{
        const user=await this.userRepo.findByUsername(dto.userName);
        if(!user){
            throw new Error("INVALID_CREDENCIALS");
        }
        const isPassValid=await bcrypt.compare(dto.password,user.passwordHash);
        if(!isPassValid){
            throw new Error("INVALID_CREDENCIALS");
        }
        const token = jwt.sign(
            { userId: user.id, userName: user.userName, role: user.role },
            this.jwtSecret,
            { expiresIn: '24h' }
        );

        await this.userRepo.updateToken(user.id, token);

        const { passwordHash: _, ...safeUser } = user;
        return { token, user: safeUser };
    }


    async logout(userId:string):Promise<void>{
        await this.userRepo.updateToken(userId,null);
    }
}