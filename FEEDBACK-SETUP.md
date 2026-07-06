# Feedback → Issue → AI Fix: Setup Guide

Visitors on the GitHub Pages mockup pin a comment anywhere on the page. Submitting opens a pre-filled GitHub issue. The moment the issue is filed, a GitHub Action wakes Claude, which edits the mockup and opens a pull request. Merging the PR redeploys Pages.

```
Visitor on Pages site
      │  clicks 💬, pins a spot, writes a comment
      ▼
Pre-filled GitHub issue form  ──(visitor presses Submit)──►  Issue created
                                                                  │  hidden marker detected
                                                                  ▼
                                                    GitHub Action: claude-code-action
                                                                  │  edits HTML/CSS
                                                                  ▼
                                                    Pull request + comment on the issue
                                                                  │  merge
                                                                  ▼
                                                    GitHub Pages redeploys — fix is live
```

## One-time setup (~5 minutes)

All steps happen on **github.com/light42-dev/uss-blue-sky**.

### 1. Enable Issues (forks have them OFF by default)
Settings → General → Features → check **Issues**.

### 2. Enable Actions
Actions tab → if prompted, click **"I understand my workflows, go ahead and enable them"** (forks disable workflows by default).

### 3. Allow Actions to open PRs
Settings → Actions → General → Workflow permissions:
- select **Read and write permissions**
- check **Allow GitHub Actions to create and approve pull requests**

### 4. Add the Anthropic API key
Settings → Secrets and variables → Actions → **New repository secret**:
- Name: `ANTHROPIC_API_KEY`
- Value: a key from https://console.anthropic.com/settings/keys

(Claude subscription instead of an API key? Run `claude` in a terminal, then `/install-github-app`, and swap `anthropic_api_key` for `claude_code_oauth_token` in both workflow files.)

### 5. Enable GitHub Pages
Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / `/ (root)`.
The site appears at `https://light42-dev.github.io/uss-blue-sky/`.

### 6. Push this repo
```bash
git push origin main
```

## Test the loop

1. Open `https://light42-dev.github.io/uss-blue-sky/`
2. Click **💬 Feedback**, click any element (e.g. the Chat send button), type a request like *"Make this button bigger"*, press **File on GitHub →**
3. Press **Submit new issue** on the GitHub tab that opens
4. Watch the **Actions** tab — the "AI Feedback Fixer" run appears within seconds
5. A PR arrives in 1–3 minutes, linked in a comment on the issue
6. Merge the PR → Pages redeploys → the fix is live

## Day-to-day controls

- **Re-run the AI on any issue** (including hand-written ones): add the `ai-fix` label.
- **Iterate on a fix**: comment `@claude make it darker instead` on the issue or the PR.
- **Widget config**: repo name, strings, and limits sit at the top of `assets/feedback.js`.
- **AI behavior**: the prompt lives in `.github/workflows/claude-feedback-fix.yml` — tighten or loosen instructions there. Switch to commit-straight-to-main by changing step 4 of the prompt.

## Notes & troubleshooting

- **Who can comment?** Anyone with a GitHub account (the repo is public). Fully anonymous comments would need a small proxy (free Cloudflare Worker) holding a token — the widget was designed so this can be added later without rework.
- **Pop-up blocked?** The widget detects this and shows a direct link instead.
- **Very long comments** are trimmed to fit GitHub's URL length limit (~8k chars).
- **Cost**: each fix run is a normal Claude API session, typically a few cents for a site this size; `--max-turns 40` caps runaway sessions.
- **Spam**: the AI is instructed to skip unclear/spam requests and just comment. For stricter control, delete the `opened` trigger in `claude-feedback-fix.yml` so only the `ai-fix` label (added by a human) starts a run.
- **Upstream repo**: everything here is self-contained; when the experiment proves out, the same three files (widget, two workflows) can be PR'd to the lead's repo unchanged — only `CONFIG.owner/repo` in `feedback.js` needs updating.
