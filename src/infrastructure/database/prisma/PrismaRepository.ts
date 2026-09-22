import { PrismaClient } from "@prisma/client/extension";
import { UserStatus,User } from "../../../domain/entities/User";

import { IUserRepository,CreateUserData,FindUserFilter,PaginatedUsers } from "../../../domain/repositories/IUserRepository";

export class PrismaUserRepository implements IUserRepository{
    constructor(private prisma: PrismaClient){}

    async create(data: CreateUserData): Promise<User> {
        const createUser= await this.prisma.user.create({
            data:{
                userName:data.userName,
                passwordHash:data.passwordHash,
                role:data.role||"USER",
                status:data.status||"ACTIVE"
            },
        });

        return createUser as User;
    }

    async findByUsername(username: string): Promise<User | null> {
        const user=await this.prisma.user.findUnique({where:{userName:username}});
        return (user as User) || null
    }

    async findAll(filter: FindUserFilter): Promise<PaginatedUsers> {
        const page = filter.page && filter.page > 0 ? filter.page : 1;
        const limit = filter.limit && filter.limit > 0 ? filter.limit : 10;
        const skip = filter.skip !== undefined ? filter.skip : (page - 1) * limit;


        const whereClause = {
            ...(filter.status && { status: filter.status }),
        };
        const [total, rawUsers] = await Promise.all([
            this.prisma.user.count({ where: whereClause }),
            this.prisma.user.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return {
            total,
            page,
            skip,
            totalPages: Math.ceil(total / limit) || 1,
            users: rawUsers as User[],
        };
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { id },
            });
        return (user as User) || null;
    }

    async updateStatus(id: string, status: UserStatus): Promise<User> {
        const updated = await this.prisma.user.update({
            where: { id },
            data: { status },
        });

        return updated as User;
    }

    async updateToken(id: string, token: string | null): Promise<void> {
        await this.prisma.user.update({
            where:{id},
            data:{token}
        });
    };

}