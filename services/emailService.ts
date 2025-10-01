import { User } from '../types';

/**
 * NOTE: This is a mock email service. In a real application, this would
 * integrate with an actual email provider like SendGrid, Mailgun, etc.
 * For now, it logs messages to the console to simulate email sending.
 */

const logEmail = (to: string, subject: string, body: string) => {
    console.log(`
    --- 📧 SIMULATING EMAIL 📧 ---
    To: ${to}
    Subject: ${subject}
    
    ${body}
    -----------------------------
    `);
};

export const sendLoginNotification = (user: User) => {
    const subject = "Security Alert: Successful Login to Your OliLab Account";
    const body = `
    Hi ${user.fullName},

    This is a confirmation that your OliLab account was just accessed.

    Date & Time: ${new Date().toLocaleString()}

    If this was you, you can safely ignore this email.
    If you do not recognize this activity, please change your password immediately and contact an administrator.

    Thank you,
    The OliLab Team
    `;
    logEmail(user.email, subject, body);
};

export const sendProfileUpdateNotification = (user: User, changedByAdmin: boolean = false) => {
    const subject = "Your OliLab Account Information Was Updated";
    const body = `
    Hi ${user.fullName},

    This email is to confirm that your account details have been successfully updated.
    ${changedByAdmin ? "\n    An administrator made this change on your behalf." : ""}

    If you did not request this change, please contact an administrator immediately.

    Thank you,
    The OliLab Team
    `;
    logEmail(user.email, subject, body);
};


export const sendNewUserAdminNotification = (newUser: User, admins: User[]) => {
    const subject = `New User Registration Pending Approval: ${newUser.fullName}`;
    const body = `
    Hello OliLab Administrators,

    A new user has just signed up and is awaiting approval.

    **User Details:**
    - Full Name: ${newUser.fullName}
    - Username: ${newUser.username}
    - Email: ${newUser.email}
    - Role: ${newUser.role}
    ${newUser.lrn ? `- LRN: ${newUser.lrn}` : ''}
    ${newUser.gradeLevel ? `- Grade: ${newUser.gradeLevel} - ${newUser.section}` : ''}

    Please visit the 'Users' page in the dashboard to approve or deny this registration request.

    Thank you,
    OliLab System
    `;
    
    admins.forEach(admin => {
        logEmail(admin.email, subject, body);
    });
};

export const sendAccountApprovedNotification = (user: User) => {
    const subject = "Your OliLab Account Has Been Approved!";
    const body = `
    Hi ${user.fullName},

    Great news! Your registration for OliLab has been approved by an administrator.
    You can now log in to your account and start using the system.

    Welcome aboard!

    Thank you,
    The OliLab Team
    `;
    logEmail(user.email, subject, body);
};


export const sendAccountDeniedNotification = (user: User) => {
    const subject = "Update on Your OliLab Account Registration";
    const body = `
    Hi ${user.fullName},

    Thank you for your interest in OliLab. After a review, we regret to inform you that your registration request has been denied at this time.
    If you believe this was a mistake, please contact a laboratory administrator directly.

    Thank you,
    The OliLab Team
    `;
    logEmail(user.email, subject, body);
};