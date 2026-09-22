import { User, UserRole, UserStatus } from "../entities/User";

export interface CreateUserData{
    userName:string;
    passwordHash:string;
    role?:UserRole;
    status?:UserStatus;
}

export interface FindUserFilter{
    page?:number;
    limit?:number;
    skip?:number;
    status?:UserStatus;
}

export interface PaginatedUsers {
    total:number;
    page:number;
    skip:number;
    totalPages:number;
    users:User[];
}

export interface IUserRepository{
    create(data:CreateUserData):Promise<User>;
    findByUsername(username:string):Promise<User |null>;
    findById(id:string):Promise<User|null>;
    findAll(filter:FindUserFilter):Promise<PaginatedUsers>;
    updateStatus(id:string,status:UserStatus):Promise<User>;
    updateToken(id:string,token:string|null):Promise<void>;
}



