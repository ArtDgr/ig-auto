// Evergreen content library for the faceless Instagram channel.
// Every niche gets: quick tips (3-slide cards), how-tos (carousels),
// and short routines (recurring posts).
//
// The bar for every item: it should sound like a working IT/tech pro handing
// over his real playbook — an exact menu path, the specific command, the
// underlying "why", and the gotcha that only hands-on experience teaches.
// Vague listicle advice ("use a password manager") is rejected on purpose.

export const NICHES = {
  "it-support": {
    label: "IT Support & Troubleshooting",
    accent: "#00E5FF",
    emoji: "🛠️",
    tags: ["#itsupport", "#techsupport", "#pchelp", "#windows11", "#windows", "#pc", "#computertips", "#fixyourpc", "#techfix", "#troubleshooting", "#computerfix", "#slowpc", "#ithelp", "#sysadmin", "#helpdesk", "#techticket"],
    tips: [
      { title: "Find what's really slowing Windows", body: "Don't guess — open Task Manager (Ctrl+Shift+Esc) > Performance and watch the CPU, Disk and Memory graphs during the lag. The one pinned at 100% is your culprit, and 9 times out of 10 it's a background updater or a browser tab, not a virus." },
      { title: "See hidden files on Windows", body: "Windows hides system files by default, which is exactly where the 'bloat' is. File Explorer > View > Show > Hidden items, and untick 'Hide protected operating system files' when you're hunting a culprit. Turn it back off when you're done." },
      { title: "A full drive is a slow drive", body: "A system drive under 15% free space will crawl no matter how new the PC is. The fix is targeted: Settings > System > Storage > Temporary files, tick everything, then remove. Never run 'disk cleaner' apps that promise the world — they delete more than they should." },
      { title: "Freeze the culprit, not the PC", body: "When a program freezes, don't hold the power button — that risks corrupting open files. Press Ctrl+Shift+Esc, find the app under Processes, right-click > End task. Windows recovers the rest; a forced shutdown kills everything at once." },
      { title: "Restart your router the right way", body: "Unplug the power for a full 60 seconds (not 10). A quick reset only reboots the modem, but 60 seconds lets the ISP renegotiate a fresh connection and clears the DHCP lease. 30% of 'WiFi is down' tickets fix with this one move." },
      { title: "Driver issues after a big update", body: "Windows feature updates can silently leave drivers behind. After any large update, open Device Manager and look for yellow warning triangles. Right-click > Update driver for each. Unresolved flags are a top cause of 'works for my friend, not me' bugs." },
      { title: "A restore point is your undo button", body: "Before any big install, create a restore point: search 'Create a restore point' > System Protection > Create. It's a 30-second habit that lets you roll back a driver or update that breaks your setup, instead of troubleshooting for an hour." },
      { title: "Stop apps auto-starting", body: "Most slow boot times come from apps auto-starting in the background. Ctrl+Shift+Esc > Startup apps tab, and disable everything you don't open within the first five minutes. You lose nothing — they still launch when you click them." },
      { title: "Fix 'PC won't turn on' basics", body: "Before assuming hardware failure: unplug every USB device except keyboard and mouse, then power on. A shorting USB device (phone, hub, cable) is one of the most common causes of a PC that won't POST. It also clears the static drain holding some boards down." }
    ],
    howtos: [
      { title: "Fix a PC that won't boot to Windows", steps: ["Unplug every USB device except keyboard and mouse", "Power on and tap F8, or Shift+Restart to reach recovery", "Troubleshoot > Advanced options > Startup Repair", "Run it twice — most boot loops die on the second pass", "Still stuck? Boot to Safe Mode and uninstall recent drivers or updates."] },
      { title: "Speed up a slow Windows PC", steps: ["Open Task Manager (Ctrl+Shift+Esc) and find what's at 100%", "Disable the worst startup apps on the Startup tab", "Free disk space: Settings > System > Storage > Temporary files", "Update drivers in Device Manager — look for yellow flags", "If RAM is maxed, close background browsers before buying anything."] },
      { title: "Connect your WiFi step by step", steps: ["Click the network icon in the system tray", "Pick your network name and enter the password exactly", "Watch for auto-correct — passwords get mangled silently", "Forget and rejoin the network if it keeps asking for the key", "Still no internet? Unplug the router for 60 seconds and retry."] },
      { title: "Back up your files the easy way", steps: ["Plug in a USB drive or external SSD", "Settings > System > Storage > Advanced > Backup options", "Turn on File History — it keeps versioned copies", "Test one restore now, not on crash day", "Keep a second copy in cloud storage in case the drive dies."] },
      { title: "Fix a frozen app without losing work", steps: ["Press Ctrl+Shift+Esc to open Task Manager", "Find the app under Processes, not Apps", "Right-click it and choose End task", "Reopen it after 10 seconds — the cache has cleared", "If it re-freezes, check for an update or reinstall it."] },
      { title: "Remove junk and bloatware safely", steps: ["Settings > Apps > Installed apps", "Uninstall trialware and toolbars you never open", "Run Disk Cleanup afterwards to free the space", "For stubborn apps, use their own uninstaller first", "Never download 'PC cleaner' tools — they cause more harm than good."] }
    ],
    routines: [
      { title: "The Monday PC check", steps: ["Restart your PC — clears most weird bugs", "Run Windows Update and reboot if it's pending", "Check disk space in Settings > System > Storage", "Empty the Recycle Bin and temp files", "You now have a clean baseline for the week."] },
      { title: "End-of-day shutdown routine", steps: ["Close heavy apps so Windows can flush caches", "Let pending updates install rather than force-shutting", "Nothing to unplug — let it sleep normally", "Fans still loud? Open Task Manager first, don't just leave it", "Done — tomorrow boots fresh and fast."] },
      { title: "Weekly router reboot", steps: ["Unplug the router's power for a full 60 seconds", "Plug it back in and wait for steady lights", "Reconnect devices that dropped off", "Run a quick speed test to confirm it's healthy", "Same day each week = stable WiFi, fewer 'why is it slow' moments."] },
      { title: "Monthly backup ritual", steps: ["Plug in your backup drive", "Run File History or your backup tool", "Check the last backup date, not just the last success", "Copy crucial photos to a second location", "Glance at drive health while you're there — simple maintenance."] }
    ],
    humor: [
      { title: "The 2am ticket", body: "Ticket #4827 at 2:14am: 'The internet is down.' Turns out the user had unplugged the router to charge their phone. We've all taken that call. The fix is 60 seconds, the recovery time is longer." },
      { title: "Have you tried turning it off", body: "IT's oldest joke is also its best advice — because it clears state, flushes memory, and resets broken sessions. Half the tickets we take close with a reboot, and that's not a failure. It's the cheapest reliable fix we have." },
      { title: "The one that got away", body: "You troubleshoot for 90 minutes. You test six things. You give up and reboot — and it works. The log's clean, the cause is gone, and the ticket closes with 'works on my end.' We don't question it. We move on." },
      { title: "It works on my machine", body: "'It works on my machine' is how the most frustrating bug in IT starts — and it's almost always a config difference, not a lie. Containers exist because of this sentence. Docker turned a meme into a career path." }
    ]
  },
  "cloud-devops": {
    label: "Cloud & DevOps",
    accent: "#7C5CFF",
    emoji: "☁️",
    tags: ["#cloud", "#devops", "#cloudcomputing", "#aws", "#azure", "#kubernetes", "#docker", "#devopslife", "#cloudinfra", "#techops", "#automation", "#server", "#sre", "#cloudcareers"],
    tips: [
      { title: "Tag resources the day you create them", body: "In any cloud, tag everything — cost, team, environment — from creation, not later. Untagged resources are how surprise bills happen, and retro-tagging is a thankless sweep nobody finishes. A 10-second habit saves a 2-hour reconciliation." },
      { title: "Never commit a secret to code", body: "API keys in a repo are a breach waiting to happen — scanners find them in minutes. Use a secrets manager or env vars, and rotate anything that ever touched a commit. A leaked key has cost teams thousands in compute and reputation." },
      { title: "Set cloud budgets before you build", body: "Cloud bills arrive monthly, but a budget alert costs nothing to set now. In your console, create a budget and alert at 50%, 80%, and 100%. The surprise bill is almost always a resource you forgot was still running." },
      { title: "Autoscale needs a hard cap", body: "Autoscaling saves money — until it scales without limit. Always set a max instance count and a scale-down schedule. 'Scale to zero' in dev and 'cap it' in prod are the two rules that keep the bill sane." },
      { title: "A backup you've never restored isn't a backup", body: "Your backup is only as good as the restore you've actually tested. Schedule a monthly restore drill to a scratch environment. Teams that skip this discover the corruption, the missing bucket, or the wrong region only when production is down." },
      { title: "Containers fix 'works on my machine'", body: "If it runs for you but not your teammate, it's local config, not magic. Docker packages the app with its runtime so dev and prod finally match. It's the fastest way to kill the most annoying class of bug in the industry." },
      { title: "IaC makes infra reviewable", body: "Clicking the console is manual and invisible — nobody reviews a click. Terraform or CloudFormation turns your infrastructure into code that gets reviewed, versioned, and rolled back. It's not extra work; it's the audit trail you'll want." },
      { title: "Docs beat tutorials", body: "Tutorials age fast and get SEO-cluttered. The official docs and reference samples stay current and correct. When a tutorial and the docs disagree, trust the docs — and note the version, because that's usually the source of the conflict." }
    ],
    howtos: [
      { title: "Deploy your first Docker container", steps: ["Install Docker Desktop or spin up a cloud VM", "Run: docker run -d -p 8080:80 nginx", "Open localhost:8080 — you're live", "See what happened: docker logs <container-id>", "Stop it with docker stop <id> — that's containers in 5 minutes."] },
      { title: "Spin up a Linux VM in the cloud", steps: ["Sign in to your cloud console", "Compute > Create VM — pick Ubuntu LTS", "Choose the smallest free-tier size", "Open port 22 (SSH) in the firewall rules", "Connect with your key pair — you have a server."] },
      { title: "Set up a GitHub Actions pipeline", steps: ["Add a workflow file in .github/workflows/", "Use a simple job: checkout + run tests", "Push — the pipeline runs automatically", "Add a deploy job that SSHes to your VM", "Now every commit tests and ships, hands-free."] },
      { title: "Put a website behind HTTPS", steps: ["Point your domain at your server's IP", "Install nginx or any web server", "Run certbot for a free Let's Encrypt cert", "Let certbot schedule auto-renewal", "Test https:// — a green padlock, no cost."] },
      { title: "Add a budget alert so you never overspend", steps: ["Open Billing > Budgets in your console", "Create a budget for your monthly target", "Add alerts at 50%, 80%, and 100%", "Send them to email or Slack", "Sleep soundly — the alert does the watching."] },
      { title: "Monitor a server with a dashboard", steps: ["Install a lightweight metrics agent", "Point it at Grafana or your cloud metrics", "Add CPU, memory, and disk widgets", "Alert at 80% CPU for sustained load", "Now you see problems before your users do."] }
    ],
    routines: [
      { title: "Monday infrastructure review", steps: ["Check last week's bill for anomalies", "Review open alerts — anything red?", "Rotate long-lived credentials if unsure", "Verify backups ran overnight", "Write down one improvement to ship this week."] },
      { title: "Daily 10-minute ops habit", steps: ["Glance at error logs — target zero new", "Check disk usage on production servers", "Confirm no stuck deployments", "Scan three key systems for pending updates", "Log off with a clean board."] },
      { title: "Weekly Terraform hygiene", steps: ["Run terraform plan to spot drift", "Remove unused resources — they still bill", "Tag anything untagged", "Update provider versions monthly", "Apply and re-run your tests."] },
      { title: "Monthly cost audit", steps: ["Download your itemized bill", "Find the top three services — is each needed?", "Turn off dev machines at night with schedules", "Downsize anything over-provisioned", "Document what you changed."] }
    ]
  },
  ai: {
    label: "AI & Machine Learning",
    accent: "#FF5C7A",
    emoji: "🤖",
    tags: ["#ai", "#artificialintelligence", "#machinelearning", "#chatgpt", "#aitech", "#genai", "#aitools", "#futuretech", "#aitips", "#aiguru"],
    tips: [
      { title: "Treat AI as a first draft, not a verdict", body: "AI output is smooth and confident — which is exactly why hallucinations are dangerous. Fact-check anything that matters against a primary source. The models are brilliant at plausible-sounding wrongness, and the confidence never drops." },
      { title: "Give AI the role and the goal", body: "'Write a professional short reply to a late-delivery complaint' beats 'help me write this'. State who it's for, what it must achieve, and the length. The more constraints you add, the less the model drifts into generic filler." },
      { title: "Use small models for small jobs", body: "You don't need a frontier model to summarize or translate. Small models are faster, cheaper, and often clearer for routine tasks. Reach for the big model only when the task genuinely needs deep reasoning." },
      { title: "Never paste private data into a chat", body: "Anything you paste can be logged, stored, or used for training. Treat every prompt like it's public before you type it. For sensitive work, use a local or enterprise instance — don't trust a public chat with client data." },
      { title: "Feed it only the relevant context", body: "Three focused paragraphs beat a pasted novel. AI reasoning degrades when you stuff the context window with noise. Extract the relevant section first, then prompt — you'll get sharper answers and use fewer tokens." },
      { title: "Agentic tools need guardrails", body: "AI agents that browse and act are powerful — and risky. Before letting one buy, change, or delete, put hard limits on what it can do and which accounts it touches. Autonomy without guardrails is how small mistakes become big bills." },
      { title: "Version your best prompts", body: "Save the prompts that work. A plain text file of your winning prompts is a real personal asset — you'll reuse them, tune them, and hand them to teammates. The people who get consistent value from AI keep a prompt library." },
      { title: "Re-test models you wrote off", body: "Model capability shifts fast — a model that failed a task six months ago may nail it now. Re-check your old assumptions every few months before dismissing an approach. The cost of re-testing is minutes; the cost of being stale is real." }
    ],
    howtos: [
      { title: "Get a useful answer from any AI", steps: ["Start with 'You are a [role] expert'", "State the goal: what must the result achieve?", "Add constraints: length, tone, audience", "Ask for options, then a recommendation", "Iterate — 'shorter' and 'more formal' each improve the pass."] },
      { title: "Summarize a long article in 2 minutes", steps: ["Copy the article or paste the text", "Prompt: 'Summarize in 5 bullets under 15 words each'", "Ask for the three biggest risks or takeaways", "Spot-check the key claim against the source", "Done — a readable summary in minutes."] },
      { title: "Write better email drafts with AI", steps: ["Give the full context in three sentences", "Specify the tone: firm, warm, brief", "Ask for two drafts — one short, one detailed", "Edit the winner by hand", "Read it aloud before you hit send."] },
      { title: "Build a simple auto-classifier", steps: ["Collect 10-20 examples per category", "Prompt: 'Classify each item into X, Y, or Z'", "Test on items you've never shown it", "Refine the examples if it's messy", "Good enough to run — keep it monitored."] },
      { title: "Automate repetitive prompts", steps: ["Turn a good prompt into a template with placeholders", "Wrap it in a small script or saved gist", "Swap in the new subject each run", "Check outputs for drift — templates decay", "Schedule a monthly review."] },
      { title: "Verify AI facts before sharing", steps: ["Ask the AI for a source for each claim", "Independently check the top two sources", "Watch for plausible but wrong dates and names", "Use AI as a lead, not the verdict", "When in doubt, mark it unverified."] }
    ],
    routines: [
      { title: "Monday AI trend scan", steps: ["List five AI headlines from the week", "Pick one that touches your work", "Try the free version of the new tool for 10 minutes", "Log one change from last month", "Block the hype — note only what you'll actually use."] },
      { title: "Daily 5-minute prompt practice", steps: ["Rewrite a real email or answer from yesterday", "Prompt for specific improvements", "Compare and keep the better version", "Save the prompt to your vault", "Five minutes a day compounds fast."] },
      { title: "Weekly AI hygiene", steps: ["Review what you pasted into AI tools", "Rotate any credentials that leaked into prompts", "Clear chat histories holding client data", "Update your saved prompt library", "Set one rule for next week's AI use."] },
      { title: "Monthly capability re-test", steps: ["Pick three tasks you gave up on with AI", "Re-prompt them with a current model", "Track whether results changed", "Adopt what actually works now", "Models move fast — test monthly, not yearly."] }
    ]
  },
  gadgets: {
    label: "Smartphones & Gadgets",
    accent: "#FFB020",
    emoji: "📱",
    tags: ["#gadgets", "#smartphone", "#tech", "#iphone", "#android", "#samsung", "#gadgetreviews", "#smartphonetips", "#techgear", "#batterytips", "#wireless", "#techdeals", "#musthavegadgets"],
    tips: [
      { title: "Charge to 80%, not 100%", body: "Lithium batteries wear fastest at the extremes — under 20% and over 80%. Leaving a phone on a 100% charge overnight slowly ages the cells. Charge to 80% for daily use and you'll keep meaningful capacity for years, not months." },
      { title: "Find the real battery drainer", body: "Don't guess which app kills your battery — your phone already knows. Check Settings > Battery > Battery usage and sort by usage. One rogue app sitting at 40%+ is usually a location or background-refresh hog you can limit in one tap." },
      { title: "Buy certified cables", body: "Cheap cables charge slower and can damage ports and controllers. Look for the USB-IF or MFi mark on the cables you use daily. That small logo is the difference between a reliable fast charge and a port that eventually dies." },
      { title: "Restart your phone weekly", body: "A weekly restart clears junk background processes and frees memory. Most 'sluggish' phones perk right back up after a fresh boot. It's the same reason IT tells you to reboot — caches and stale sessions build up silently." },
      { title: "Check battery health before buying used", body: "Used phones lose battery capacity, and the listing won't tell you how much. Check Settings > Battery > Battery Health before paying top dollar. A phone at 85% or lower means a replacement battery or a short life is coming." },
      { title: "Adaptive brightness saves your eyes and battery", body: "Turn on adaptive brightness and let the phone read ambient light. You get the same visible quality with less eye strain and fewer recharges — because your screen is the single biggest battery drain on the device." },
      { title: "Verify links before you tap", body: "Long-press a link to preview the real URL before opening it. Look-alikes like 'amaz0n.com' or 'paypaI.com' are phishing setups, not typos. This one 2-second habit blocks most account-takeover scams aimed at phone users." },
      { title: "Back up before the storage-full alert", body: "Enable auto-backup now, because the 'storage full' alert always arrives late. Phone storage fills silently with photos and video. Automatic backup means the worst case is a full gallery, not a lost year of memories." }
    ],
    howtos: [
      { title: "Extend your phone's battery life", steps: ["Drop brightness or turn on adaptive", "Enable low power mode at 30%, not 10%", "Check Settings > Battery for the biggest drainer", "Turn off location for apps that don't need it", "Charge to 80% and carry on."] },
      { title: "Transfer everything to a new phone", steps: ["Back up the old phone first", "Choose 'transfer from old device' during setup", "Scan the QR or pair the two phones", "Let it copy apps, photos, and messages", "Log in as accounts appear — done."] },
      { title: "Free up storage in 10 minutes", steps: ["Open Settings > Storage", "Delete duplicate screenshots and videos first", "Offload apps you haven't opened in months", "Archive large files and old documents", "Check the photo library — it's usually the real hog."] },
      { title: "Cut digital glare at night", steps: ["Turn on night mode / blue-light filter at sunset", "Lower brightness in dark rooms", "Enable dark mode where available", "Keep the phone out of arm's reach of the bed", "Your sleep wins, and your eyes thank you."] },
      { title: "Stop apps tracking your every move", steps: ["Settings > Privacy > Location services", "Deny location for apps that don't need it", "Revoke camera and mic access you don't use", "Reset your advertising ID", "You keep your data — apps still work the same."] },
      { title: "Set up a better morning phone routine", steps: ["Plug in at night — 80% is plenty", "Glance at the lock screen, don't dive in", "Clear junk notifications once a day", "Enable battery saver on your commute", "Arrive with 90% and a clearer head."] }
    ],
    routines: [
      { title: "Sunday phone declutter", steps: ["Delete ten things you don't use — apps, photos, notes", "Check which apps eat the most battery", "Turn on an auto-backup you trust", "Update all apps overnight", "Switch off one notification — instant relief."] },
      { title: "Monthly gadget check", steps: ["Clean ports and speakers gently", "Check battery health in settings", "Charge to 100% once to recalibrate", "Update the OS if prompted", "Scope your next upgrade while it's calm."] },
      { title: "End-of-day phone shutdown", steps: ["Close the five apps you left open", "Check battery — under 20%? top up", "Let night mode kick in", "Silence work pings with Do Not Disturb", "Phone beside the bed, not under the pillow."] },
      { title: "Weekly WiFi sanity check",
        steps: ["Restart the router", "Run a speed test on your main device", "Forget and rejoin WiFi if it's weak", "Move the router or phone closer for a day", "Small improvements, logged every week."],
        details: [
          "Unplug power for a full 60 seconds, then plug back in — this clears the DHCP and thermal dropouts a quick reset can't fix, and a 2.4/5 GHz router typically takes 2–3 minutes to fully come back.",
          "Test the same room as your router first (a clean baseline), then the room you use most — download AND upload, twice each. If one room is consistently 30%+ slower, that's a signal, not a coincidence.",
          "WiFi adapters can pin a stale, congested channel or a dead 5 GHz band. Forget the network, power-cycle the phone, rejoin and re-enter the password so it renegotiates a fresh connection.",
          "Routers radiate a doughnut-shaped signal, not evenly — corner cupboards, fish tanks and metal racks eat it. Even moving it 1 m off the floor or out of a cabinet can double the usable range.",
          "One metric per week is the trick that makes this a habit: note the speed number in the same app, same room, same time of day — trends beat one-off tests every time."
        ] }
    ]
  },
  security: {
    label: "Cybersecurity & Privacy",
    accent: "#FF4D4D",
    emoji: "🔐",
    tags: ["#cybersecurity", "#security", "#privacy", "#cybersectips", "#phishing", "#onlinesafety", "#datasecurity", "#infosec", "#password", "#2fa", "#cyberdefense", "#secops", "#threathunting", "#incidentresponse", "#zerotrust"],
    tips: [
      { title: "Spot a phishing email in 2 seconds", body: "Never trust the display name — check the actual sender address. A 'PayPal' email from 'paypaI-support@mail.ru' is phishing no matter how official it looks. Then hover the links: if the URL doesn't match the company's real domain, delete it." },
      { title: "Password manager beats memory", body: "Reusing a password is how one breach becomes ten. A password manager generates and stores a unique password for every site, so a leak anywhere doesn't cascade. You memorize one master password; it handles the rest." },
      { title: "2FA: authenticator app over SMS", body: "SMS codes are better than nothing, but SIM-swap attacks can steal them. Use an authenticator app (or hardware key) for your email, banking, and anything important. The app ties the code to your device, not your phone number." },
      { title: "Hover every link before you click", body: "In an email, hover over a link and read the real URL in the status bar before clicking. Look-alikes like 'amaz0n.com' or 'micros0ft.com' are social engineering, not typos. One hover beats a world of regret." },
      { title: "Patch day is a security control", body: "Most breaches exploit known, patched-able vulnerabilities — not zero-days. A scheduled monthly patch window is a security control, not IT housekeeping. The org that treats 'restart to update' as a security step gets hit far less often." },
      { title: "Assume the account is compromised", body: "If a user account may be compromised, don't fix and forget: force a reset, revoke sessions, audit for mailbox rules and MFA registrations, then check login history. Attackers set persistence that a simple password change never touches." },
      { title: "Zero trust for small orgs too", body: "Zero trust isn't just for enterprises. Least-privilege access, MFA on everything, and logging who touches what applies at a 20-person office. The attackers don't check company size — the defenses shouldn't either." },
      { title: "Beware 'official-looking' SMS", body: "Texts can be spoofed to look like they come from your bank. If a text asks for a code or urges urgent action, call the number on the back of your card — never the one in the message. Real banks don't ask for codes by text." },
      { title: "Lock your screen, always", body: "A locked device is 90% of the prevention. Windows key + L when you step away, biometrics on your phone. It takes one second and stops the most common data loss on the planet: someone picking up an unlocked device." }
    ],
    howtos: [
      { title: "Respond to a suspected breach", steps: ["Isolate the affected machine from the network", "Revoke the account's sessions and reset credentials", "Check for persistence: mailbox rules, new MFA, scheduled tasks", "Audit logs for what the attacker accessed", "Report and document — then patch the gap that let it in."] },
      { title: "Spot a phishing email in 30 seconds", steps: ["Check the sender address, not just the display name", "Hover links to see the real URL", "Watch for urgency and threats — 'act now' is a red flag", "Look for odd grammar and typos in the body", "In doubt? Contact the company on a known number."] },
      { title: "Set up 2FA on any account", steps: ["Open Settings > Security > Two-factor", "Prefer an authenticator app over SMS", "Scan the QR with your authenticator", "Save the backup codes somewhere safe", "Test a login with a code before you log out."] },
      { title: "Create a strong, memorable passphrase", steps: ["Pick four random words, e.g. Guitar-Maple-Frost-Cedar", "Keep it long — 16+ characters", "Add symbols only if a site demands them", "Never reuse it anywhere else", "Let your password manager remember the rest."] },
      { title: "Wipe an old phone safely",
        steps: ["Back up what you want to keep", "Sign out of all accounts first", "Turn off Find My Device", "Factory reset — not just delete", "Verify it asks for fresh setup, then pass it on."],
        details: [
          "A factory reset erases the whole phone — so export photos and messages to your cloud sync, or copy everything to a cable/bluetooth transfer. Skipping this is how the new phone turns out to be missing a year of memories.",
          "Log out of Google, Apple, banking and social apps BEFORE the wipe. An account left signed in can lock the new owner out, and a signed-in session survives on the phone's login data even after some resets.",
          "iOS: Settings > your name > Find My iPhone — switch it off (activation lock ties the phone to your Apple ID after a reset). Android: remove the Google account and disable Find My Device, or the next person can hit a hard FRP lock.",
          "Settings > System > Reset > Erase all data (factory reset). 'Delete' in a file manager only frees space — remnants stay. On iPhone the wipe also unsyncs your iCloud and wipes the list of trusted devices.",
          "A clean wipe boots straight into the 'hello' / fresh-setup screen with no lock or accounts. If it ever asks for a password during setup, the reset didn't fully work — redo it before handing the phone over."
        ] },
      { title: "Lock down your router", steps: ["Log in to your router's admin page", "Change the default admin password", "Turn off remote management", "Use WPA2 or WPA3 encryption", "Update the firmware — security patches hide there."] },
      { title: "Clean up data brokers", steps: ["Search yourself on people-search sites", "Use each site's opt-out page", "Remove your listing and note the case ID", "Re-check in 30 days — they re-add", "Switch your email to a spam-safe address."] }
    ],
    routines: [
      { title: "Monday security sweep", steps: ["Install pending security updates", "Check the last logins on your top three accounts", "Revoke sessions you don't recognize", "Confirm 2FA is on for the important ones", "Close the tab — safer than most already."] },
      { title: "Weekly patch window", steps: ["Pick a day and time — same slot weekly", "Apply OS, browser, and critical app updates", "Reboot and confirm the build number", "Log what got patched — know your baseline", "Next week, do it again. That's the control."] },
      { title: "Weekly credential audit", steps: ["List accounts with admin or privileged access", "Revoke anything unused or stale", "Force MFA on every privileged account", "Check for shared passwords — kill them", "Rotate anything that ever touched a breach."] },
      { title: "Monthly privacy audit", steps: ["Download an app permission report", "Revoke camera, mic, and location you forgot", "Delete old accounts and saved passwords", "Retire abandoned apps entirely", "Test your 2FA backup codes still work."] }
    ],
    humor: [
      { title: "It's not paranoia, it's infosec", body: "Clicking a link from your own CEO without checking the domain? That's how one team 'renamed' their whole domain with a ransom note. The paranoia isn't a bug — it's the job. Hover the link, verify the sender, then click." },
      { title: "The password with 12 exclamation marks", body: "'Password123!!!!!!' looks strong to the person who wrote it and takes a cracking tool about 3 seconds. Length beats punctuation every time. Four random words, one master password, and a manager for the rest." },
      { title: "Patch Tuesday is a holiday", body: "Everyone on the internet dreads Patch Tuesday except IT — that's when the security debt gets paid. Miss a month and you're the newsletter headline. The monthly reboot isn't the enemy; the unpatched box is." }
    ]
  },
  apple: {
    label: "Apple & macOS",
    accent: "#C7E1FF",
    emoji: "🍎",
    tags: ["#apple", "#iphone", "#ipad", "#mac", "#macbook", "#macos", "#ios", "#airpods", "#appletv", "#applewatch", "#applenews", "#appleintelligence", "#siri", "#appstore", "#appleinsider"],
    tips: [
      { title: "Three-finger drag is the hidden gem", body: "On a MacBook, Settings > Trackpad > Accessibility > 'Enable dragging' and pick 'Three-finger drag'. It turns moving windows and selecting text into a one-gesture motion. Most Mac owners never find it, and it's the fastest way to work the trackpad." },
      { title: "Enable Low Power Mode early", body: "Low Power Mode buys real time when you're out — but only if you turn it on early. Control Center (swipe down top-right) > Battery, or wait until 20%. Starting it at 30-40% stretches the last stretch far more than at the death rattle." },
      { title: "App Library ends the swipe marathon", body: "On iOS, swipe left past your last home page to get App Library — instant app search without endless page-swiping. Long-press a home screen, tap 'Edit' and hide whole pages of apps you rarely open. Cleaner home, faster launching." },
      { title: "Control Center is the fast lane", body: "Swipe down from the top-right on iPhone to toggle Wi-Fi, Bluetooth, Focus and brightness without Settings hunting. Add your most-toggled controls by long-pressing and tapping the +. Fewer trips into Settings every day." },
      { title: "Check battery health before you buy used", body: "Settings > Battery > Battery Health shows real capacity. Do this before buying any used iPhone or iPad. A device at 85% or lower is a battery replacement or short life waiting to happen — use it as a bargaining chip." },
      { title: "Stage Manager for real multitasking", body: "On iPad and macOS, Stage Manager groups your active apps so switching between work windows is one click instead of a Dock hunt. Enable it in Control Center and pin the two or three apps you actually use side by side." },
      { title: "Hide dragged files from your Desktop", body: "Drag files onto the Dock icon of an app (or a folder in the sidebar) instead of the Desktop. It keeps your screen clean and out of screenshots — the Desktop is the most shared surface on a Mac, and it's usually a mess." },
      { title: "Batch-delete screenshots", body: "Screenshots pile up silently and eat iCloud space. Open the Photos 'Screenshots' album once a week and wipe what you don't keep. It's a 30-second weekly habit that stops the photo library slowly filling the cloud." }
    ],
    howtos: [
      { title: "Back up your iPhone before iOS updates", steps: ["Connect to Wi-Fi and power", "Settings > your name > iCloud > iCloud Backup", "Tap Back Up Now — wait for it to finish", "Install the update from Settings > General", "If anything breaks, restore from the backup you made."] },
      { title: "Free up iPhone storage in 5 minutes", steps: ["Settings > General > iPhone Storage", "Delete the biggest offline videos and games first", "Offload apps you haven't opened in months", "Let iOS offload photos automatically", "Check again in a week — it stays under control."] },
      { title: "Find your MacBook battery drainer", steps: ["Open Activity Monitor (Spotlight > 'Activity Monitor')", "Sort by CPU, then by Energy", "Close the browser tab silently maxing cores", "Check background apps under the Energy tab", "Dim the screen — the display uses the most."] },
      { title: "Get notifications under control on iPhone", steps: ["Settings > Notifications", "Turn off everything that isn't an actual person", "Leave badges only for mail and messages", "Enable Scheduled Summary for the rest", "One quiet morning of work and you'll feel it."] },
      { title: "Set up iCloud Keychain properly", steps: ["Settings > your name > iCloud > Passwords & Keychain", "Turn on Passwords & Keychain", "Add your important logins to it", "Enable it on your Mac too (System Settings > Apple Account)", "Autofill everywhere, one passcode to remember."] },
      { title: "AirDrop files the right way", steps: ["Turn on AirDrop on both devices (Control Center)", "Set Contacts Only so strangers can't send", "Select the file, Share > AirDrop, pick the person", "Accept on the receiving device", "Confirmed — no cable, no cloud middleman."] }
    ],
    routines: [
      { title: "Sunday Apple maintenance", steps: ["Update iOS and all installed apps", "Check iCloud backup ran overnight", "Clear the screenshot and duplicates albums", "Review which apps use location", "Charge to 80% and set the week up clean."] },
      { title: "Weekly iPhone battery watch", steps: ["Open Settings > Battery to see usage", "Spot any app at 40%+ — cull it", "Turn on Low Power Mode before long days", "Unplug at 80-90%, not 100% all night", "One week of this and battery life ticks up."] },
      { title: "Monthly Apple account check", steps: ["Review Safari passwords for reused ones", "Check iCloud storage plan usage", "Revoke apps that have your Apple ID access", "Update app privacy settings you forgot", "Sign out of iCloud on devices you sold."] }
    ]
  },
  hardware: {
    label: "Laptops & PC Hardware",
    accent: "#8FE3B0",
    emoji: "💻",
    tags: ["#laptop", "#pc", "#hardware", "#gpu", "#cpu", "#nvidia", "#amd", "#intel", "#ssd", "#ram", "#benchmark", "#gamingpc", "#laptops", "#techreview", "#notebook"],
    tips: [
      { title: "SSD over HDD changes everything", body: "Swapping a spinning drive for an SSD is the single biggest speed gain you can buy — boots and app opens go from minutes to seconds. It's a 15-minute swap on most laptops and it revives even decade-old machines." },
      { title: "RAM prices are climbing — time your upgrade", body: "With the chip shortage squeezing DRAM supply, RAM prices are trending up again. If a PC is sluggish with multiple tabs open, RAM is usually the pain — but 'buy now' isn't always right. Compare current module prices to your upgrade's benefit, and lock in a good price when it dips. Timing an upgrade is now a real part of the decision." },
      { title: "Match the chip to the chassis", body: "A thin laptop with an H-series CPU will throttle under sustained load — the chassis can't cool it. For portability pick a U-series chip; for sustained work, an H-series in a chunkier, better-cooled chassis. The number alone doesn't tell the story." },
      { title: "The GPU's TGP matters more than the name", body: "Two laptops with the 'same' RTX chip can differ hugely in performance because of TGP — how many watts the GPU is allowed to draw. A higher-wattage, lower-tier GPU often beats a low-power version of a higher tier. Check the reviews for real sustained numbers." },
      { title: "A bright panel beats a dim 4K", body: "Read the panel specs before buying: brightness (nits), refresh rate, and color gamut matter more than OLED hype. A bright 120Hz panel you can actually see beats a dim 4K one you strain to read. Nits are the spec that gets skipped." },
      { title: "Cooling is the real spec", body: "Two similar laptops perform differently under load because of thermals. Vapor-chamber cooling plus sensible fan tuning usually means better sustained speed than raw spec numbers. Skim the review notes for throttle behavior, not just the benchmark score." },
      { title: "Update your drivers cleanly", body: "After a big Windows update or a new GPU driver, old driver remnants can conflict. Keep drivers current, but when one misbehaves, do a clean reinstall (uninstall with the vendor tool, reboot, install fresh) instead of layering fixes on top." },
      { title: "Check battery health before buying used", body: "Laptop batteries degrade, and the listing won't tell you the real capacity. Run a battery report (Windows: `powercfg /batteryreport`) before paying top dollar. A battery at 70% health means a replacement cost you should price in." }
    ],
    howtos: [
      { title: "Speed up an old Windows laptop", steps: ["Check disk usage — a full drive kills everything", "Upgrade to an SSD first — the cheapest big win", "Only then weigh RAM: chip-shortage prices are up, so compare cost vs benefit", "Disable startup apps in Task Manager", "Reinstall Windows 11 clean if it still crawls."] },
      { title: "Check a GPU before you buy a game laptop", steps: ["Look up the laptop model on a benchmark site", "Compare sustained FPS at your target resolution", "Skim the thermal/review notes — throttling hides there", "Confirm the GPU's total TGP in the reviews", "Warranty length is the tiebreaker."] },
      { title: "Monitor your laptop's real temps", steps: ["Install a lightweight temp tool (open-source)", "Run a 15-minute stress load or a game", "Watch CPU/GPU temps while under load", "Below 90C sustained is fine; above, clean the vents", "Raise the laptop on a stand — bottom airflow helps."] },
      { title: "Set up proper battery care", steps: ["Cap charge at 80% if your vendor offers it", "Avoid leaving it at 100% for weeks on end", "Occasional deep discharge is fine, not daily", "Keep firmware and battery drivers updated", "A battery at 80% capacity after 2 years is normal."] },
      { title: "Buy a laptop that fits your work", steps: ["List the three apps that slow your current PC", "Match CPU tier and RAM to that list", "Confirm the port needs — USB-C, HDMI, storage", "Get 16GB+ RAM and an SSD minimum", "Buy from a brand with known reliability and warranty."] },
      { title: "Clean a laptop without breaking it", steps: ["Power down and unplug first", "Use compressed air in short bursts on vents", "Wipe the lid with microfiber and isopropyl", "Never spray liquid directly at ports or fans", "Do it quarterly — dust is the silent throttler."] }
    ],
    routines: [
      { title: "Monthly laptop health check", steps: ["Run a disk check and free 10% drive space", "Update drivers and firmware from the vendor", "Check fan vents and clean light dust", "Glance at temps after a load test", "Log the battery health % — done in 10 minutes."] },
      { title: "Weekly backup ritual", steps: ["Backup drive or cloud-sync your work files", "Verify the last backup date, not just success", "Test one restore of a folder you really need", "Stash critical documents in a second location", "Automate it so you stop thinking about it."] },
      { title: "Quarterly hardware review", steps: ["Compare your current spec to your main apps' needs", "Check RAM/SSD prices — chip-shortage means timing matters", "Look up warranty remaining on laptop and battery", "Decide upgrade vs new purchase, with the numbers", "Either way, budget one hour of maintenance weekly."] }
    ]
  }
};

export default { NICHES };
