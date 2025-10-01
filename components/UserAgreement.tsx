import * as React from 'react';

export const UserAgreement: React.FC = () => (
    <div className="prose prose-sm prose-invert max-w-none max-h-[60vh] overflow-y-auto pr-4 text-slate-300">
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <p>Welcome to OliLab! This User Agreement ("Agreement") is a legal contract between you and the laboratory management. By creating an account and using the OliLab Science Laboratory Management System ("Service"), you agree to be bound by the terms and conditions outlined below.</p>

        <h3>1. Account Responsibility</h3>
        <ul>
            <li>You are responsible for maintaining the confidentiality of your account password.</li>
            <li>You are fully responsible for all activities that occur under your account.</li>
            <li>You agree to notify an administrator immediately of any unauthorized use of your account.</li>
            <li>Accounts are for individual use only and are not transferable.</li>
        </ul>

        <h3>2. Responsible Use of Laboratory Equipment</h3>
        <ul>
            <li>You agree to use all laboratory items, chemicals, and equipment responsibly and for educational purposes only.</li>
            <li>You are responsible for borrowing and returning items in a timely manner and in the same condition you received them.</li>
            <li>Any damage to equipment due to negligence may result in academic penalties or financial liability.</li>
            <li>You must report any malfunctioning or broken equipment to a lab administrator immediately.</li>
        </ul>

        <h3>3. Data Privacy and Collection</h3>
        <ul>
            <li>The Service collects personal information such as your name, email, and LRN for the purpose of managing laboratory inventory and tracking borrowed items.</li>
            <li>Your borrowing history will be logged and maintained by the system for accountability.</li>
            <li>We are committed to protecting your data. However, this is a demonstration application, and you should not use real personal information if you have privacy concerns. The system does not guarantee enterprise-level security.</li>
        </ul>
        
        <h3>4. Prohibited Conduct</h3>
        <p>You agree not to use the Service to:</p>
        <ul>
            <li>Engage in any activity that is unlawful or fraudulent.</li>
            <li>Attempt to gain unauthorized access to other users' accounts or administrative functions.</li>
            <li>Intentionally misrepresent information when borrowing or returning items.</li>
            <li>Interfere with or disrupt the integrity or performance of the Service.</li>
        </ul>

        <h3>5. Termination of Account</h3>
        <p>The laboratory administration reserves the right to suspend or terminate your account at any time for violations of this Agreement or for any other reason deemed necessary to maintain the safety and integrity of the laboratory.</p>

        <h3>6. Changes to the Agreement</h3>
        <p>We may modify this Agreement from time to time. We will notify you of significant changes. Continued use of the Service after such changes constitutes your consent to the new terms.</p>
        
        <p>By checking the box during sign-up, you acknowledge that you have read, understood, and agree to be bound by this User Agreement.</p>
    </div>
);
