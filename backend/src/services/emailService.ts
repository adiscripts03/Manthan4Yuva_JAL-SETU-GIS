import nodemailer from 'nodemailer';

// Since we don't have production SMTP credentials right now,
// we'll setup a simple fallback logger or ethereal (test) account for demonstration.
export const sendOperatorEmail = async (subject: string, body: string, priority: string, toEmail: string = "bt25ece007@iiitn.ac.in") => {
  try {
    // In production, replace with real SMTP (e.g. Gmail, Outlook, SendGrid)
    // For now we setup a test account quickly.
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const prefix = priority === 'high' ? '[URGENT] ' : '[SUPPORT] ';

    const info = await transporter.sendMail({
      from: '"JalSetu Intelligent Operator" <system@jalsetu.ai>',
      to: toEmail,
      subject: `${prefix}${subject}`,
      text: body,
    });

    console.log(`Operator email sent successfully!`);
    console.log(`Preview URL: %s`, nodemailer.getTestMessageUrl(info));
    return nodemailer.getTestMessageUrl(info);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error('Failed to send email');
  }
};
