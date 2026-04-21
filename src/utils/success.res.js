export const successRes=({res ,messaage="Done",data={},status=200  })=>{
   return res.status(status).json({messaage,data})
}