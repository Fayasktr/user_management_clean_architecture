import { PrismaClient } from "@prisma/client/extension";

export const prisma =new PrismaClient({
    log:process.env.NODE_ENV=== 'development'? ['query','error','warn']:['error'],
});

export const connectSQL = async(): Promise<void> =>{
    try{
        await prisma.$connect();
        console.log("connected sql");
    }catch (error){
        console.error("sql connection faild");
        process.exit(1);
    }
}

