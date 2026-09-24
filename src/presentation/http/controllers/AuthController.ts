import {Request, Response, NextFunction} from "express";
import { AuthService } from "../../../application/services/AuthService";
import { publishUserEvent } from "../../../infrastructure/messaging/rabbitmq";
import { AuthenticatedRequest } from "../middlewares/authTypes";

export class AuthController{
    constructor(private authService: AuthService){};

    register =async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try{
            const {userName,password,role} =req.body;
            if(!userName || !password){
                res.status(400).json({
                    success:false,
                    error:{code:"VALIDATION_ERROR", message: "Username and password are requried"}
                });
                return;
            }
            
            const user= await this.authService.register({userName,password,role});
            publishUserEvent('USER_CREATED',user);
            res.status(201).json({
                success:true,
                message:'User registred successfully',
                data:user
            })
        }catch(e){
            next(e);
        }
    }

    login =async(req:Request,res:Response,next:NextFunction)=>{
        try{
            const {userName,password, role}=req.body;

            if(!userName || !password){
                res.status(400).json({
                    success:false,
                    error:{code:"VALIDATION_ERROR", message: "Username and password are requried"}
                });
                return;
            }
            
            const result=await this.authService.login({userName,password});

            res.status(200).json({
                success:true,
                message:'Login successful',
                data:result
            });

        }catch(e){
            next(e);
        }
    }

    logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        });
        return;
      }
      await this.authService.logout(userId);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully. Session token revoked.',
      });
    } catch (error) {
      next(error);
    }
  };
}