import { User, UserStatus } from "../../domain/entities/User";
import { FindUserFilter, IUserRepository, PaginatedUsers } from "../../domain/repositories/IUserRepository";


export class AdminService{
    constructor(private userRepo:IUserRepository){}

    async getAllUsers(filter:FindUserFilter):Promise<PaginatedUsers>{
        return await this.userRepo.findAll(filter);
    }

    async getUserById(id:string):Promise<User>{
        const user=await this.userRepo.findById(id);
        if(!user){
            throw new Error("USER_NOT_FOUND");
        }
        return user;
    }

    async updateUserStatus(id: string, status: UserStatus): Promise<User> {
        const user = await this.userRepo.findById(id);
        if (!user) {
                throw new Error('USER_NOT_FOUND');
        }
        return await this.userRepo.updateStatus(id, status);
    }
}