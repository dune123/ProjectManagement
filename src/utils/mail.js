import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (option) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Project Management App",
      link: "https://www.projectmanagementapp.com",
    },
  });

  const mailgenContent = option.mailgenContent ?? option.mailGenContent;
  if (!mailgenContent) {
    throw new Error("mailgenContent is required to generate email template");
  }

  const emailHTML = mailGenerator.generate(mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: process.env.MAIL_FROM || "mail.taskmanager@example.com",
    to: option.email,
    subject: option.subject,
    html: emailHTML,
  };

  await transporter.sendMail(mail);
};

const emailVerificationOtpMailgenContent = (username, otp, expiryMinutes) => {
  return {
    body: {
      name: username,
      intro: "Welcome! Use the verification code below to verify your email address.",
      dictionary: {
        "Verification code": otp,
        Expires: `in ${expiryMinutes} minutes`,
      },
      outro:
        "If you did not create an account, no further action is required.",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset your password to your account.",
      action: {
        instructions: "To reset your password, please click the button below:",
        button: {
          color: "#22BC66",
          text: "Reset Password",
          link: passwordResetUrl,
        },
      },
      outro: "If you did not create an account, no further action is required.",
    },
  };
};

export {
  emailVerificationOtpMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
