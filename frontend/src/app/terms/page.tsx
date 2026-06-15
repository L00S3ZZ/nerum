'use client'

import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

interface Section {
  title: string
  body: string[]
}

const SECTIONS: Section[] = [
  {
    title: 'ACCEPTANCE OF TERMS',
    body: [
      'By accessing or using nerum.in or any Nerum services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this platform. You must be at least 18 years of age to use Nerum. If you are under 18, you may only use the platform under the supervision of a parent or legal guardian who agrees to be bound by these terms.',
    ],
  },
  {
    title: 'DESCRIPTION OF SERVICE',
    body: [
      'Nerum is an AI-powered workflow automation platform that helps Indian businesses connect and automate tools including WhatsApp, Gmail, Telegram, Google Sheets, Razorpay, Tally, Shopify, and more. The platform supports both Tamil and English languages. Nerum operates on a subscription basis with Free, Starter, Pro, and Business plans. We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice.',
    ],
  },
  {
    title: 'ACCOUNT REGISTRATION & SECURITY',
    body: [
      'To use Nerum, you must create an account with accurate, complete, and current information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify Nerum at support@nerum.in of any unauthorized use of your account. Nerum cannot and will not be liable for any loss or damage arising from your failure to protect your credentials. One account per individual or business entity unless explicitly approved by Nerum in writing.',
    ],
  },
  {
    title: 'ACCEPTABLE USE POLICY',
    body: [
      'You agree to use Nerum only for lawful purposes. You must not use the platform to send spam, phishing messages, unsolicited bulk messages, or any content that is illegal, harmful, threatening, abusive, harassing, defamatory, or obscene. You must not attempt to gain unauthorized access to any part of the platform, reverse-engineer the software, deploy automated bots to abuse the system, or interfere with the platform’s security. Any violation of this policy may result in immediate account suspension or termination without notice or refund.',
    ],
  },
  {
    title: 'SUBSCRIPTIONS & PRICING',
    body: [
      'Nerum offers the following subscription plans: Free (₹0/month), Starter (₹799/month), Pro (₹1,399/month), and Business (₹3,499/month). All prices are in Indian Rupees and inclusive of applicable taxes unless stated otherwise. Nerum reserves the right to change pricing at any time with 30 days’ prior notice to existing subscribers. Continued use of the platform after a price change constitutes acceptance of the new pricing.',
    ],
  },
  {
    title: 'PAYMENT TERMS',
    body: [
      'All payments are processed securely through Razorpay. By providing your payment details, you authorize Nerum to charge your selected payment method for the applicable subscription fees. Subscriptions are billed on a monthly or annual basis depending on your selected plan. You are responsible for ensuring your payment method remains valid. Failed payments may result in immediate suspension of your account until payment is resolved.',
    ],
  },
  {
    title: 'NO REFUND POLICY',
    body: [
      'ALL PAYMENTS MADE TO NERUM ARE STRICTLY NON-REFUNDABLE. Once a subscription payment is processed, no refunds will be issued under any circumstances, including but not limited to: dissatisfaction with the service, accidental purchases, unused portions of a subscription period, account suspension or termination due to policy violations, or changes in your business needs. By completing payment, you explicitly acknowledge and agree to this no-refund policy. We strongly encourage you to use our Free plan to evaluate the platform before upgrading to a paid plan.',
    ],
  },
  {
    title: 'NO CANCELLATION POLICY',
    body: [
      'Nerum operates on a prepaid subscription model. Once a subscription period has been purchased and payment processed, it CANNOT be cancelled, reversed, or refunded for any remaining unused period. You may choose not to renew your subscription at the end of the current billing cycle by contacting support@nerum.in at least 7 days before your renewal date. If you do not request non-renewal before the renewal date, your subscription will automatically renew and the resulting charge will be non-refundable. Downgrading to a lower plan takes effect at the next billing cycle only — no partial-period credits or refunds will be issued for the current cycle.',
    ],
  },
  {
    title: 'AUTO-RENEWAL',
    body: [
      'All paid subscriptions automatically renew at the end of each billing cycle unless you explicitly request cancellation of auto-renewal at least 7 days before the renewal date. Nerum will send a renewal reminder to your registered email 7 days before the charge. By subscribing, you authorize Nerum to charge your payment method on each renewal date. Auto-renewal charges are non-refundable.',
    ],
  },
  {
    title: 'FREE PLAN LIMITATIONS',
    body: [
      'The Free plan is provided as-is with limited features and is subject to fair use limits. Nerum reserves the right to modify, restrict, or discontinue the Free plan at any time without notice. Free accounts that are inactive for more than 12 consecutive months may be deleted without notice. Data associated with deleted free accounts cannot be recovered.',
    ],
  },
  {
    title: 'BRING YOUR OWN KEY (BYOK)',
    body: [
      'Nerum allows users on certain plans to connect their own AI API keys (Claude, GPT, Groq, Gemini, etc.) to power automation workflows. Users who use BYOK are solely responsible for their API key usage, costs incurred on the third-party platform, and compliance with the respective third-party terms of service. Nerum is not responsible for any charges, rate limits, or suspensions imposed by third-party AI providers on your keys.',
    ],
  },
  {
    title: 'INTEGRATIONS & THIRD-PARTY SERVICES',
    body: [
      'Nerum connects to third-party services including but not limited to WhatsApp (Meta), Google Workspace, Razorpay, Telegram, Shopify, Tally, and Zoho. Nerum is not affiliated with, endorsed by, or responsible for these third-party services. We are not liable for any downtime, API changes, data loss, or service interruptions caused by third-party platforms. Your use of integrations is subject to the respective third-party terms of service and privacy policies.',
    ],
  },
  {
    title: 'DATA & PRIVACY',
    body: [
      'Nerum collects and processes data as described in our Privacy Policy. Your integration credentials are encrypted using AES-256-GCM encryption. We do not sell your personal data to third parties. By using Nerum, you consent to the collection and use of your data as outlined in our Privacy Policy. We store data on secure servers and aim for Indian data residency where technically feasible.',
    ],
  },
  {
    title: 'INTELLECTUAL PROPERTY',
    body: [
      'All content on the Nerum platform, including but not limited to the Nerum name, Neru mascot, logo, software, designs, text, graphics, and workflows built by Nerum, are the exclusive intellectual property of Nerum and protected by applicable Indian and international copyright and trademark laws. You may not copy, modify, distribute, sell, or create derivative works of any Nerum content without prior written permission. You retain full ownership of the data and workflows you create using the platform.',
    ],
  },
  {
    title: 'USER CONTENT & DATA',
    body: [
      'You retain ownership of all data, workflows, and content you create or upload to Nerum. By using the platform, you grant Nerum a limited, non-exclusive, royalty-free license to store, process, and display your content solely for the purpose of providing the service to you. You are solely responsible for ensuring that your content does not violate any laws or third-party rights. Nerum reserves the right to remove any content that violates these terms.',
    ],
  },
  {
    title: 'FEEDBACK LICENSE',
    body: [
      'If you provide Nerum with feedback, suggestions, or ideas about the platform, you grant Nerum an irrevocable, worldwide, royalty-free license to use, reproduce, modify, and incorporate that feedback into our products and services without any obligation to compensate you or credit you for the feedback.',
    ],
  },
  {
    title: 'AGGREGATED DATA',
    body: [
      'Nerum may collect, analyse, and use aggregated, anonymised data about platform usage — such as workflow run counts, integration usage trends, and feature adoption metrics — for the purpose of improving the platform, generating industry insights, and for marketing purposes. This aggregated data will never identify you personally.',
    ],
  },
  {
    title: 'CONFIDENTIALITY',
    body: [
      'Both parties agree to keep confidential any non-public information disclosed during use of the platform. Nerum will treat your business data, workflow configurations, and integration credentials as confidential and will not disclose them to third parties except as required by law or as necessary to provide the service.',
    ],
  },
  {
    title: 'ACCOUNT SUSPENSION & TERMINATION',
    body: [
      'Nerum reserves the right to suspend or permanently terminate your account at its sole discretion, with or without notice, for any violation of these Terms, fraudulent activity, abusive behavior, or actions that harm other users or the platform. Upon termination: access to the platform ceases immediately, no refund will be issued for any remaining subscription period, and your data will be deleted within 30 days. You may also terminate your account at any time from Settings. Provisions that survive termination include: Intellectual Property, No Refund Policy, Limitation of Liability, Governing Law, and Indemnification.',
    ],
  },
  {
    title: 'LIMITATION OF LIABILITY',
    body: [
      'To the maximum extent permitted by applicable law, Nerum and its directors, employees, partners, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business opportunities, arising out of or in connection with your use of the platform. In no event shall Nerum’s total liability to you exceed the total amount paid by you to Nerum in the three months immediately preceding the event giving rise to the claim. Nerum is not responsible for losses caused by third-party API failures, network outages, or force majeure events.',
    ],
  },
  {
    title: 'DISCLAIMER OF WARRANTIES',
    body: [
      'Nerum is provided on an “as is” and “as available” basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. Nerum does not warrant that the platform will be uninterrupted, error-free, or completely secure. You use the platform at your own risk.',
    ],
  },
  {
    title: 'INDEMNIFICATION',
    body: [
      'You agree to indemnify, defend, and hold harmless Nerum and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your access to or use of the platform, your violation of these Terms, or your infringement of any third-party rights.',
    ],
  },
  {
    title: 'FORCE MAJEURE',
    body: [
      'Nerum shall not be liable for any failure or delay in performance arising out of circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, government actions, internet or power outages, or third-party service failures. During such events, Nerum’s obligations will be suspended for the duration of the force majeure event.',
    ],
  },
  {
    title: 'CLASS ACTION WAIVER',
    body: [
      'To the fullest extent permitted by applicable law, you agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. You waive any right to participate in a class action lawsuit or class-wide arbitration against Nerum.',
    ],
  },
  {
    title: 'SEVERABILITY',
    body: [
      'If any provision of these Terms is found to be unenforceable or invalid under applicable law, that provision will be modified to the minimum extent necessary to make it enforceable, or if modification is not possible, it will be severed from these Terms. The remaining provisions will continue in full force and effect.',
    ],
  },
  {
    title: 'ENTIRE AGREEMENT',
    body: [
      'These Terms, together with our Privacy Policy and any other policies or agreements referenced herein, constitute the entire agreement between you and Nerum regarding your use of the platform and supersede all prior agreements, understandings, and representations.',
    ],
  },
  {
    title: 'CHANGES TO TERMS',
    body: [
      'Nerum reserves the right to modify these Terms at any time. We will notify you of material changes by email at least 7 days before they take effect. Your continued use of the platform after the effective date of the updated Terms constitutes your acceptance of the changes. If you do not agree to the updated Terms, you must stop using the platform before the effective date.',
    ],
  },
  {
    title: 'GOVERNING LAW & JURISDICTION',
    body: [
      'These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from or related to these Terms or your use of Nerum shall be subject to the exclusive jurisdiction of the courts located in Chennai, Tamil Nadu, India. We encourage you to contact us at legal@nerum.in to resolve any disputes informally before initiating legal proceedings.',
    ],
  },
  {
    title: 'CONTACT INFORMATION',
    body: [
      'If you have any questions, concerns, or requests regarding these Terms of Service, please contact us:',
      'Email: support@nerum.in | Legal: legal@nerum.in | Location: Chennai, Tamil Nadu, India | Website: nerum.in',
      'We aim to respond to all legal enquiries within 5 business days.',
    ],
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen" style={{ background: '#07080F' }}>
      <Navbar />

      <section className="pt-32 pb-12 text-center px-6">
        <h1 className="plasma-gradient-text font-bold text-5xl mb-4">Terms &amp; Conditions</h1>
        <p className="text-gray-400 text-sm tracking-widest uppercase">Last updated: June 2026</p>
        <p className="text-gray-500 text-sm mt-3 max-w-xl mx-auto">
          Please read these terms carefully before using Nerum. By using our platform, you agree to be bound by these terms.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-32 space-y-10">
        {SECTIONS.map((s, i) => (
          <div key={s.title}>
            <h2 className="text-white font-semibold text-lg mb-3 pl-4 border-l-2" style={{ borderColor: '#FF6B00' }}>
              {i + 1}. {s.title}
            </h2>
            <div className="text-gray-300 text-[15px] leading-relaxed space-y-3 pl-4">
              {s.body.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </section>

      <Footer />
    </main>
  )
}
