export const metadata = { title: "How the Points System Works" };

export default function DirectSellingPage() {
  return (
    <div className="container-page max-w-3xl prose prose-sm">
      <h1>How the Points System Works — Plain English</h1>

      <h2>Points only — no money</h2>
      <ul>
        <li>This program runs on <strong>points</strong>. Points are an internal loyalty unit.</li>
        <li><strong>1 point = 1 point.</strong> Points are not currency. They cannot be exchanged for cash, transferred to a bank, or converted to rupees.</li>
        <li>No money is paid or received as part of the referral activity itself.</li>
        <li>Points unlock <strong>physical reward gifts</strong> at fixed milestones (see the rewards ladder).</li>
      </ul>

      <h2>The whole rulebook</h2>
      <ul>
        <li>Each member has exactly two referral slots: a <strong>Left</strong> and a <strong>Right</strong>.</li>
        <li><strong>Direct-referral credit (+200):</strong> whenever you place a new member directly below you, you get 200 points for that addition.</li>
        <li><strong>First-pair bonus (+500):</strong> the moment you fill <em>both</em> your Left and Right slots — i.e. you have at least one direct referral on each side — you get a one-time 500-point bonus.</li>
        <li><strong>Pair-match credit:</strong> after the first pair, every additional pair formed in your downline (i.e. the smaller of your two leg sizes goes up by one) adds 200 points to you. The +200 rate applies for joiners up to 15 levels below you; from the 16th level onward each pair-match adds 100 points.</li>
        <li>Points are tracked daily (daily cutoff) and reflected on your dashboard the next day.</li>
      </ul>

      <h2>The example — Priya&apos;s binary tree</h2>
      <p>
        Priya joins using your link. She fills her Left slot with <strong>Rahul</strong> and her Right slot with <strong>Anjali</strong>. That is Level 1 below Priya — 2 people. Priya earns <strong>200 + 200 = 400 points</strong> for the two direct referrals, plus a one-time <strong>+500 first-pair bonus</strong> for filling both slots: <strong>900 points</strong> in total at this stage.
      </p>
      <p>
        Rahul then refers one person on his Left. Priya gets <em>nothing</em> at this stage — her Left leg has grown but her Right leg has not, so no new pair has formed. Rahul, as the direct referrer, gets +200 points.
      </p>
      <p>
        Anjali then refers one person on her Left. Now Priya has one extra person on each side, so a new pair has formed in her downline: Priya earns <strong>+200 points for the pair match</strong>. Anjali gets +200 as the direct referrer.
      </p>
      <p>
        If Rahul and Anjali each refer <em>two</em> people below them, Priya&apos;s Left and Right legs each grow by 2 — two new pair matches in total — and Priya earns <strong>+400 points</strong>.
      </p>
      <p>
        This pair-match logic applies through every level. Up to 15 levels below Priya each pair is worth 200 points to her; at level 16 and beyond every pair is worth 100 points.
      </p>

      <h2>The rewards ladder</h2>
      <p>
        Reward gifts are unlocked when your tree fills to a given level. The exact tier list (welcome kit → power bank → mobile → laptop → two-wheeler → car → gold → house → villa) is published on the affiliate page. Gifts are dispatched after the level is verified at daily cutoff.
      </p>

      <h2>What you do NOT get</h2>
      <ul>
        <li>You do not get cash. Points have no cash value and are never paid out as money.</li>
        <li>You do not get points for &quot;buying&quot; ranks, paying joining bonuses, or any pay-to-progress mechanic.</li>
        <li>You do not get points for a leg that has no matching activity on the other side — pair matches only fire when both legs grow.</li>
        <li>From level 16 onward each pair-match is worth 100 points, not 200.</li>
      </ul>

      <h2>If you leave</h2>
      <p>
        You can leave any time. Points are forfeited on exit and cannot be cashed out — points have no monetary value to begin with. Reward gifts already delivered are yours to keep.
      </p>
    </div>
  );
}
