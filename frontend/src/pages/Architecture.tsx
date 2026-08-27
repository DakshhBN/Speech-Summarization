import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const REPO_URL = "https://github.com/DakshhBN/Speech-Summarization";

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <section className="fade-up glass rounded-xl p-6" style={{ animationDelay: `${delay}s` }}>
      <h2 className="text-lg font-semibold mb-3 gradient-text w-fit">{title}</h2>
      {children}
    </section>
  );
}

export default function Architecture() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14 space-y-5">
      <div className="fade-up">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> back to notes
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-4">Architecture</h1>
        <p className="text-slate-400 mt-1.5">How summary.ai turns a recording into a transcript and a summary.</p>
      </div>

      <Section title="Upload-to-transcript flow" delay={0.05}>
        <p className="text-slate-300 leading-relaxed">
          A user drops an audio file on the homepage. The backend validates it (extension, size,
          a file-header sniff to catch corrupt or mislabeled files), uploads the raw bytes to
          Supabase Storage, and inserts a <code className="text-orange-300">notes</code> row with status{" "}
          <code className="text-orange-300">uploaded</code>. It returns immediately with a note id, and a
          background task takes over from there: submit the file to Gnani's batch transcription
          API, poll until it finishes, then run the transcript through an LLM for a summary. The
          frontend polls the note every couple seconds and the status chip walks through{" "}
          <code className="text-orange-300">uploaded → transcribing → summarizing → done</code> (or{" "}
          <code className="text-rose-300">failed</code>).
        </p>
      </Section>

      <Section title="File storage" delay={0.1}>
        <p className="text-slate-300 leading-relaxed">
          Raw audio is stored in a Supabase Storage bucket, one object per note keyed by its UUID.
          The detail page plays audio back via a short-lived signed URL rather than a public link.
          Gnani's batch API only accepts a file upload (no "fetch from this URL" option), so the
          backend forwards the bytes it already has in memory from the original upload request
          straight to Gnani, instead of round-tripping through storage a second time.
        </p>
      </Section>

      <Section title="Long-audio handling" delay={0.15}>
        <p className="text-slate-300 leading-relaxed">
          Gnani's synchronous STT endpoint caps out at 60 seconds of audio, which rules it out for
          this assignment's 2+ minute requirement. Every upload here goes through Gnani's async
          Batch STT API instead: create a job, start it, poll <code className="text-orange-300">GET /jobs/{"{id}"}</code>{" "}
          every 10 seconds until it reaches a terminal state, then fetch the transcript file. Batch
          jobs also cap individual files at 10MB, which is enforced client-side (so the user gets
          instant feedback) and re-checked server-side (since the client can't be trusted).
          Transient errors from Gnani (rate limits, 5xx) are retried with exponential backoff
          before the note is marked failed.
        </p>
      </Section>

      <Section title="What runs sync vs background" delay={0.2}>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-white/10">
                <th className="py-2 px-2">Step</th>
                <th className="py-2 px-2">Runs</th>
                <th className="py-2 px-2">Detail</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {[
                ["Upload", "Sync", "Validate, write to storage, insert DB row, return note id — all in the request."],
                ["Transcription", "Background", "Gnani batch job create/start/poll/fetch, up to a 15 minute timeout."],
                ["Summarization", "Background", "One-shot LLM call over the transcript."],
                ["Crash recovery", "Sync, on boot", "Startup hook re-drives any note stuck mid-pipeline for too long."],
                ["Progress display", "Sync polling", <>Frontend polls <code className="text-orange-300">GET /notes/{"{id}"}</code> every ~2s while non-terminal.</>],
              ].map(([step, runs, detail], idx) => (
                <tr key={idx} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 px-2 whitespace-nowrap text-slate-200">{step}</td>
                  <td className="py-2.5 px-2 whitespace-nowrap text-amber-300">{runs}</td>
                  <td className="py-2.5 px-2 text-slate-400">{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="On background jobs and crash resilience" delay={0.25}>
        <p className="text-slate-300 leading-relaxed">
          There's no Redis or task queue here — transcription and summarization run as an
          in-process FastAPI background task on the same web service. Render's free tier doesn't
          include a free background worker, so a "proper" queue setup would mean either paying for
          a worker or running Redis/RQ in the same dyno anyway, which wouldn't actually buy real
          crash isolation over the alternative. Instead, resilience comes from the database: on
          startup the app looks for any note stuck in <code className="text-orange-300">transcribing</code> or{" "}
          <code className="text-orange-300">summarizing</code> for too long and automatically re-drives it
          through the pipeline. That covers the main failure mode this app cares about — a Render
          restart or redeploy killing an in-flight job — without adding a new service.
        </p>
      </Section>

      <Section title="What I'd improve with more time" delay={0.3}>
        <ul className="space-y-2 text-slate-300">
          {[
            "Per-user auth, instead of a single shared notes list",
            "A real job queue (Celery/RQ + Redis) with a dedicated worker for true crash isolation",
            "Webhook-based completion instead of polling Gnani (docs recommend polling as the source of truth, but a hybrid would cut latency)",
            "Resumable/chunked uploads for flaky connections",
            "Server-side audio transcoding to guarantee the 10MB batch limit is met instead of just rejecting oversized files",
            "Rate limiting on the upload endpoint",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-2 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Source" delay={0.35}>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors"
        >
          {REPO_URL} <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </Section>
    </div>
  );
}
