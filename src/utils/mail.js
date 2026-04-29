import Mailgen from "mailgen"
import nodemailer from "nodemailer"
import dotenv from "dotenv"

const sendEmail=async(option)=>{
    const mailGenerator=new Mailgen({
        theme:"default",
        product:{
            name:"Project Management App",
            link:"https://www.projectmanagementapp.com"
        }
    })

    const emailTexual=mailGenerator.setTemplate(option.mailGenContent)

    const emailHTML=mailGenerator.generate(option.mailGenContent)

    const transporter=nodemailer.createTransport({
        host:process.env.MAILTRAP_SMTP_HOST,
        port:process.env.MAILTRAP_SMTP_PORT,
        auth:{
            user:process.env.MAILTRAP_SMTP_USER,
            pass:process.env.MAILTRAP_SMTP_PASS
        }
    })

    const mail={
        from: "mail.taskmanager@example.com",
        to: option.email,
        subject: option.subject,
        text: emailTexual,
        html: emailHTML,
    }

    try {
        await transporter.sendMail(mail)
    } catch (error) {
        console.error("Error sending email:", error)
    }
}

const emailVerificationMailgenContent=async(username,verificationUrl)=>{
    return{
        body:{
            name:username,
            intro:"Welcome to our application! We're excited to have you on board.",
            action:{
                instructions:"To verify your email address, please click the button below:",
                button:{
                    color:"#22BC66",
                    text:"Verify Email",
                    link:verificationUrl
                }
            },
            outro:"If you did not create an account, no further action is required."
        }
    }
}

const forgotPasswordMailgenContent=async(username,passwordResetUrl)=>{
    return{
        body:{
            name:username,
            intro:"We got a request to reset your password to your account.",
            action:{
                instructions:"To reset your password, please click the button below:",
                button:{
                    color:"#22BC66",
                    text:"Reset Password",
                    link:passwordResetUrl
                }
            },
            outro:"If you did not create an account, no further action is required."
        }
    }
}

export {emailVerificationMailgenContent,forgotPasswordMailgenContent,sendEmail}