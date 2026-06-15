/* ============================================================================
 * NERUM — Landing page
 * ----------------------------------------------------------------------------
 * DESIGN DECISIONS (the thinking before the code)
 *
 * The metaphor — NERUM ≈ "narambu" (நரம்பு), the Tamil word for *nerve*. An
 * Indian business already runs on a tangle of disconnected apps (WhatsApp,
 * Razorpay, Tally, Sheets…). Nerum is the nerve that fires a signal across all
 * of them. Every visual leans into this: a neuron logo, a "nerve field" of
 * rising particles, glowing signals travelling down wires. The product name,
 * the metaphor and the demo are one idea.
 *
 * The wow moment — <WorkflowNerve>. A live, animated SVG flow: a customer's
 * WhatsApp message fires a glowing spark down the wires, through an AI logic
 * node, and out to three actions (reply / log to Sheets / Razorpay link). It
 * tilts up from a 3D plane as you scroll into it. This is the page's heartbeat:
 * "watch a Nerum fire."
 *
 * The hero — kinetic typography. The headline noun cycles: "Automation for
 * shops / clinics / schools / restaurants / gyms." A Chennai shop
 * owner sees their own business named in the first three seconds.
 *
 * Style — "Liquid Glass" (per ui-ux-pro-max): translucent cards, animated
 * iridescent hairline borders, dynamic blur, fluid 400–600ms motion. Brand
 * palette is locked: bg #07080F, orange #FF6B00, violet #7B2FFF, cyan #00D4FF,
 * yellow #FFD60A. Type: Space Grotesk (display) + Plus Jakarta (body) +
 * JetBrains Mono (data/labels).
 *
 * Motion system — every animation earns its place: entry sequence (assembling
 * wordmark), custom cursor (global), kinetic hero, infinite integrations
 * marquee, scroll-driven 3D tilt on the wow section, scroll-lit nerve line in
 * How-it-works, pointer-tilt + glare on feature cards, odometer stats, ambient
 * plasma orbs + particle field. All transform/opacity, all gated behind
 * prefers-reduced-motion, all 60fps.
 *
 * Emotional journey, top → bottom:
 *   hook → "it speaks my tools" → "watch it actually work" → what it does →
 *   how easy → the proof → the ask.
 * ========================================================================== */

import Background from '@/components/landing/Background'
import EntryLoader from '@/components/landing/EntryLoader'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Integrations from '@/components/landing/Integrations'
import WorkflowNerve from '@/components/landing/WorkflowNerve'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import Stats from '@/components/landing/Stats'
import DemoSection from '@/components/landing/DemoSection'
import PricingSection from '@/components/landing/PricingSection'
import CTABanner from '@/components/landing/CTABanner'
import Footer from '@/components/landing/Footer'
import SectionBurst from '@/components/landing/SectionBurst'

export default function LandingPage() {
  return (
    <>
      <EntryLoader />
      <Background />
      <Navbar />
      <main style={{ position: 'relative', background: 'transparent' }}>
        <Hero />
        <Integrations />
        <WorkflowNerve />
        <SectionBurst />
        <Features />
        <SectionBurst />
        <HowItWorks />
        <DemoSection />
        <Stats />
        <SectionBurst />
        <PricingSection />
        <CTABanner />
        <Footer />
      </main>
    </>
  )
}
