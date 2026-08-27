import { Link } from "react-router-dom";

const REPO_URL = "https://github.com/dakshh25/audio-notes-platform";

export default function Architecture() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <Link to="/" className="text-blue-400 hover:underline text-sm">
          &larr; back to notes
        </Link>
        <h1 className="text-2xl font-semibold mt-4">Architecture</h1>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-2">Upload-to-transcript flow</h2>
        <p className="text-slate-300 leading-relaxed">
          A user drops an audio file on the homepage. The backend validates it (extension, size,
          a file-header sniff to catch corrupt or mislabeled files), uploads the raw bytes to
          Supabase Storage, and inserts a <code>notes</code> row with status <code>uploaded</code>.
          It returns immediately with a note id, and a background task takes over from there:
          submit the file to Gnani's batch transcription API, poll until it finishes, then run the
          transcript through an LLM for a summary. The frontend polls the note every couple
          seconds and the status chip walks through <code>uploaded → transcribing → summarizing →
          done</code> (or <code>failed</code>).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">File storage</h2>
        <p className="text-slate-300 leading-relaxed">
          Raw audio is stored in a Supabase Storage bucket, one object per note keyed by its UUID.
          The detail page plays audio back via a short-lived signed URL rather than a public link.
          Gnani's batch API only accepts a file upload (no "fetch from this URL" option), so the
          backend forwards the bytes it already has in memory from the original upload request
          straight to Gnani, instead of round-tripping through storage a second time.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Long-audio handling</h2>
        <p className="text-slate-300 leading-relaxed">
          Gnani's synchronous STT endpoint caps out at 60 seconds of audio, which rules it out for
          this assignment's 2+ minute requirement. Every upload here goes through Gnani's async
          Batch STT API instead: create a job, start it, poll <code>GET /jobs/{"{id}"}</code> every
          10 seconds until it reaches a terminal state, then fetch the transcript file. Batch jobs
          also cap individual files at 10MB, which is enforced client-side (so the user gets
          instant feedback) and re-checked server-side (since the client can't be trusted).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">What runs sync vs background</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="py-2 pr-4">Step</th>
                <th className="py-2 pr-4">Runs</th>
                <th className="py-2">Detail</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 whitespace-nowrap">Upload</td>
                <td className="py-2 pr-4 whitespace-nowrap">Sync</td>
                <td className="py-2 text-slate-300">
                  Validate, write to storage, insert DB row, return note id — all in the request.
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 whitespace-nowrap">Transcription</td>
                <td className="py-2 pr-4 whitespace-nowrap">Background</td>
                <td className="py-2 text-slate-300">
                  Gnani batch job create/start/poll/fetch, up to a 15 minute timeout.
                </td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 whitespace-nowrap">Summarization</td>
                <td className="py-2 pr-4 whitespace-nowrap">Background</td>
                <td className="py-2 text-slate-300">One-shot LLM call over the transcript.</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 whitespace-nowrap">Crash recovery</td>
                <td className="py-2 pr-4 whitespace-nowrap">Sync, on boot</td>
                <td className="py-2 text-slate-300">
                  Startup hook re-drives any note stuck mid-pipeline for too long.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 whitespace-nowrap">Progress display</td>
                <td className="py-2 pr-4 whitespace-nowrap">Sync polling</td>
                <td className="py-2 text-slate-300">
                  Frontend polls <code>GET /notes/{"{id}"}</code> every ~2s while non-terminal.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">On background jobs and crash resilience</h2>
        <p className="text-slate-300 leading-relaxed">
          There's no Redis or task queue here — transcription and summarization run as an
          in-process FastAPI background task on the same web service. Render's free tier doesn't
          include a free background worker, so a "proper" queue setup would mean either paying for
          a worker or running Redis/RQ in the same dyno anyway, which wouldn't actually buy real
          crash isolation over the alternative. Instead, resilience comes from the database: on
          startup the app looks for any note stuck in <code>transcribing</code> or{" "}
          <code>summarizing</code> for too long and automatically re-drives it through the
          pipeline. That covers the main failure mode this app cares about — a Render restart or
          redeploy killing an in-flight job — without adding a new service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">What I'd improve with more time</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-1">
          <li>Per-user auth, instead of a single shared notes list</li>
          <li>A real job queue (Celery/RQ + Redis) with a dedicated worker for true crash isolation</li>
          <li>Webhook-based completion instead of polling Gnani (docs recommend polling as the source of truth, but a hybrid would cut latency)</li>
          <li>Resumable/chunked uploads for flaky connections</li>
          <li>Server-side audio transcoding to guarantee the 10MB batch limit is met instead of just rejecting oversized files</li>
          <li>Retry/backoff on transient Gnani API errors</li>
          <li>Basic rate limiting on the upload endpoint</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Source</h2>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:underline"
        >
          {REPO_URL}
        </a>
      </section>
    </div>
  );
}
