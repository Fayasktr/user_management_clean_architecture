import express,{Application,Request,Response} from "express";
import cors from "cors";
import helmet from "helmet";
import apiRoutes from "./http/routes/index";
import {errorHandler} from "./http/middlewares/errorMiddleware";


export const createApp =(): Application =>{
    const app=express();

    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({extended:true}));

    app.get("/health",(_req:Request,res:Response)=>{
        res.status(200).json({status:"UP",timestamp:new Date().toISOString()});
    })

    app.use("/api",apiRoutes);

    app.use((_req:Request,res:Response)=>{
        res.status(404).json({
            success:false,
            error:{code:"NOT_FOUND", message: "Route does not exist"}
        });
    });

    app.use(errorHandler);
    return app;
}