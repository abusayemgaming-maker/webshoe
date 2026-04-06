import * as React from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontContent } from '../features/home/hooks/useStorefrontContent';
import CommerceRouteHeader from '../features/shared/ui/CommerceRouteHeader';
import UISurfaceCard from '../features/shared/ui/primitives/UISurfaceCard';
import { useDocumentTitle } from '../features/shared/hooks/useDocumentTitle';

const WhyUsFaqPage: React.FC = () => {
  useDocumentTitle('Why Us + FAQ | Velosnak Atelier');

  const { content } = useStorefrontContent();

  return (
    <div className="relative overflow-hidden px-4 pb-16 pt-24 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(180deg,_#f7f2eb_0%,_#ffffff_70%)]" />

      <CommerceRouteHeader
        eyebrow="Trust + support"
        title="Why shop us and FAQ"
        subtitle="Everything about store quality, delivery clarity, and buyer support in one dedicated page."
      />

      <section className="storefront-shell">
        <UISurfaceCard className="rounded-[2.5rem] p-6 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">{content.trust.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">{content.trust.headline}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {content.trust.items.map((item) => (
              <article key={item.title} className="rounded-[1.8rem] border border-zinc-200 bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{item.eyebrow}</p>
                <h3 className="mt-3 text-xl font-black tracking-tight text-zinc-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600">{item.body}</p>
              </article>
            ))}
          </div>
        </UISurfaceCard>
      </section>

      <section className="storefront-shell mt-10">
        <UISurfaceCard className="rounded-[2.5rem] p-6 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">{content.faq.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">{content.faq.headline}</h2>
          <div className="mt-6 space-y-4">
            {content.faq.items.map((item) => (
              <article key={item.question} className="rounded-[1.8rem] border border-zinc-200 bg-white p-5">
                <h3 className="text-lg font-black tracking-tight text-zinc-950">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </UISurfaceCard>
      </section>

      <section className="storefront-shell mt-10">
        <UISurfaceCard tone="glass" className="rounded-[2.5rem] p-6 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Next step</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">Ready to pick your pair?</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/collection"
              className="rounded-full bg-zinc-950 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-white"
            >
              Shop collection
            </Link>
            <Link
              to="/"
              className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-zinc-700"
            >
              Back home
            </Link>
          </div>
        </UISurfaceCard>
      </section>
    </div>
  );
};

export default WhyUsFaqPage;
