// Evergreen content library for the faceless Instagram channel.
// Every niche gets: quick tips (single image), how-tos (carousels),
// and short routines (recurring image posts). Text is written to be
// useful, specific, and scannable at a glance.

export const NICHES = {
  "it-support": {
    label: "IT Support & Troubleshooting",
    accent: "#00E5FF",
    emoji: "🛠️",
    tags: ["#itsupport", "#techsupport", "#pchelp", "#windows11", "#windows", "#pc", "#computertips", "#fixyourpc", "#techfix", "#troubleshooting", "#computerfix", "#slowpc", "#ithelp"],
    tips: [
      { title: "Clean out startup apps", body: "Half of slow boots are apps auto-starting in the background. Open Task Manager > Startup apps and disable everything you don't need daily." },
      { title: "Use Disk Cleanup", body: "A full drive slows everything. Run Disk Cleanup on C:, tick 'Windows Update Cleanup', and you can reclaim gigabytes." },
      { title: "Update drivers after Windows updates", body: "Windows feature updates can leave drivers behind. Check Device Manager for yellow flags and update them right after a big update." },
      { title: "Never force shut down", body: "Holding the power button to reset a frozen PC risks corrupting files. Use Ctrl+Alt+Delete first, then the power button as the last resort." },
      { title: "Restart your router, not your WiFi", body: "If the internet drops daily, reboot the router's power once a week. It clears DNS cache and stale connections." },
      { title: "Watch your RAM pressure", body: "Task Manager > Performance > Memory shows when RAM is maxed. That's why things lag. Close tab hogs first, then consider an upgrade." },
      { title: "Windows updates matter", body: "Missing updates are the #1 cause of 'works everywhere but my PC' bugs. Set updates to auto and don't skip restarts." },
      { title: "Make a restore point", body: "Before big installs, create a restore point (System Protection). It's the fastest undo button you'll ever have." }
    ],
    howtos: [
      { title: "Fix a PC that won't boot to Windows", steps: ["Unplug all USB devices except keyboard and mouse", "Power on and tap F8 or Shift+Restart", "Choose Troubleshoot > Advanced options > Startup Repair", "Run it twice — most boot loops die here", "Still stuck? Boot into Safe Mode and uninstall recent drivers."] },
      { title: "Speed up a slow Windows PC", steps: ["Check Task Manager for what's at 100% — that's your culprit", "Disable heavy startup apps", "Run Disk Cleanup to free drive space", "Update your drivers", "If RAM is maxed, close background browsers before adding hardware."] },
      { title: "Connect your WiFi step by step", steps: ["Click the network icon in the system tray", "Pick your network name from the list", "Enter the password exactly — watch for auto-correct", "Forget and rejoin if it keeps asking", "Still no internet? Reboot the router and retry."] },
      { title: "Back up your files the easy way", steps: ["Plug in a USB drive or external SSD", "Go to Settings > System > Backup > Add a drive", "Turn on File History — it saves versions", "Test a restore now, not on crash day", "Keep a second copy in cloud storage for fires."] },
      { title: "Fix a frozen app without losing data", steps: ["Press Ctrl+Shift+Esc to open Task Manager", "Find the frozen app under Processes", "Right-click it and choose End task", "Wait 10 seconds and reopen it — cache is cleared", "If it re-freezes, reinstall the app."] },
      { title: "Remove junk and bloatware safely", steps: ["Open Settings > Apps > Installed apps", "Uninstall apps you never open — trialware, toolbars", "Run Disk Cleanup afterwards", "For stubborn apps, use their own Uninstall option", "Never download random 'PC cleaner' tools — they cause more harm."] }
    ],
    routines: [
      { title: "The Monday PC check", steps: ["Restart your PC — clears 90% of weird bugs", "Run Windows Update and reboot if pending", "Check disk space in Settings > Storage", "Empty the Recycle Bin and temp files", "You now have a clean baseline for the week."] },
      { title: "End-of-day shutdown routine", steps: ["Close heavy apps so Windows can flush caches", "Let pending updates install", "Nothing to unplug — just let it sleep", "Fans still loud? Open Task Manager first to find the hog", "Done — tomorrow boots fresh."] },
      { title: "Weekly router reboot", steps: ["Unplug your router's power for 30 seconds", "Plug it back in and wait for steady lights", "Reconnect devices that dropped off", "Run a quick speed test to confirm", "Same day each week = stable WiFi."] },
      { title: "Monthly backup ritual", steps: ["Plug in your backup drive", "Run File History or your backup tool", "Check the last backup date, not just the last success", "Copy crucial photos to a second location", "Clean the fans while you're there — simple maintenance."] }
    ]
  },
  "cloud-devops": {
    label: "Cloud & DevOps",
    accent: "#7C5CFF",
    emoji: "☁️",
    tags: ["#cloud", "#devops", "#cloudcomputing", "#aws", "#azure", "#kubernetes", "#docker", "#devopslife", "#cloudinfra", "#techops", "#automation", "#server", "#sre", "#cloudcareers"],
    tips: [
      { title: "Tag your cloud resources first", body: "In any cloud, tag resources — cost, team, environment — from day one. Untagged resources are how surprise bills happen." },
      { title: "Keep secrets out of code", body: "Never commit API keys. Use a secrets manager or env vars. A leaked key can cost thousands in minutes." },
      { title: "Use IaC for everything", body: "Clicking around the console is manual. Terraform turns your infrastructure into reviewable, repeatable code." },
      { title: "Set up budgets early", body: "Cloud bills come monthly, but a budget alert costs you nothing. Set 50% / 80% / 100% alerts now." },
      { title: "Containers make dev = prod", body: "If it works for you but not your teammate, it's probably local config. Docker is the fastest fix." },
      { title: "Autoscale needs caps", body: "Autoscaling saves money — until it scales everything. Add max-size caps and scale-down schedules." },
      { title: "Test your backups", body: "A backup you've never restored isn't a backup. Automate a monthly restore drill." },
      { title: "Docs beat tutorials", body: "Tutorials age fast. The official docs and samples are the most current and correct source." }
    ],
    howtos: [
      { title: "Deploy your first Docker container", steps: ["Install Docker Desktop or a cloud VM", "Run: docker run -d -p 8080:80 nginx", "Open localhost:8080 — you're live", "Check logs with docker logs <container-id>", "Stop it with docker stop <id>. That's containers in 5 minutes."] },
      { title: "Spin up a Linux VM in the cloud", steps: ["Sign in to your cloud console", "Compute > Create VM — pick Ubuntu LTS", "Choose a small size in the free tier", "Open port 22 (SSH) in the firewall", "Connect with your key pair. You have a server."] },
      { title: "Set up a GitHub Actions pipeline", steps: ["Add a workflow file in .github/workflows/", "Use a simple job: checkout + run tests", "Push — the pipeline runs automatically", "Add a deploy job with SSH to your VM", "Now every commit tests and ships."] },
      { title: "Put a website behind HTTPS", steps: ["Point a domain at your server's IP", "Install nginx or any web server", "Run certbot for a free Let's Encrypt cert", "Auto-renew — certbot schedules it", "Test https:// — padlock for free."] },
      { title: "Add a budget alert so you never overspend", steps: ["Open Billing > Budgets in your console", "Create a budget for $50/month", "Add alerts at 50%, 80%, and 100%", "Send them to email or Slack", "Sleep soundly — alerts are on."] },
      { title: "Monitor your server with a dashboard", steps: ["Install a lightweight metrics agent", "Point it at Grafana or your cloud metrics", "Add CPU, memory, and disk widgets", "Alert at 80% CPU", "Now you see problems before users do."] }
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
      { title: "Treat AI as a first draft", body: "AI output is a great start, but always fact-check. Hallucinations are smooth and convincing." },
      { title: "Be specific to get better answers", body: "Give the role, audience, and length. 'Write a professional short reply to a late-delivery complaint' beats 'help me'." },
      { title: "Small models for small jobs", body: "You don't need a giant model to summarize or translate. Small models are faster and cheaper for routine tasks." },
      { title: "Never paste private data", body: "Anything you paste can be logged. Treat every prompt like it's public before you type it." },
      { title: "Use context windows wisely", body: "Feed the AI only the relevant text. Three focused paragraphs beat a pasted novel." },
      { title: "Agentic tools need guardrails", body: "AI agents that browse and act are powerful. Put limits on what they can buy, change, or delete." },
      { title: "Version your prompts", body: "Save prompts that work. A small text file of winning prompts is a real personal asset." },
      { title: "Re-test models often", body: "Model capabilities shift fast. Re-check old assumptions every few months before dismissing an approach." }
    ],
    howtos: [
      { title: "Get a useful answer from any AI", steps: ["Start with 'You are a [role] expert'", "State the goal: what should the result do?", "Add constraints: length, tone, audience", "Ask for options, then a recommendation", "Iterate — 'shorter' and 'more formal' each improve the pass."] },
      { title: "Summarize a long article in 2 minutes", steps: ["Copy the article or paste the text", "Prompt: 'Summarize in 5 bullets under 15 words each'", "Ask for the three biggest risks or takeaways", "Spot-check the key claim against the source", "Done — readable summary in minutes."] },
      { title: "Write better email drafts with AI", steps: ["Give the full context in three sentences", "Specify the tone: firm, warm, brief", "Ask for two drafts — one short, one detailed", "Edit the winner by hand", "Read it aloud before hitting send."] },
      { title: "Build a simple auto-classifier", steps: ["Collect 10-20 examples per category", "Prompt: 'Classify each item into X, Y, or Z'", "Test on items you've never shown it", "Refine examples if it's messy", "Good enough to run — keep it monitored."] },
      { title: "Automate repetitive prompts", steps: ["Turn a good prompt into a template with placeholders", "Wrap it in a small script or saved gist", "Swap in the new subject each run", "Check outputs for drift — templates decay", "Schedule a monthly review."] },
      { title: "Verify AI facts before sharing", steps: ["Ask the AI for sources for each claim", "Independently check the top two sources", "Watch for plausible but wrong dates", "Use AI as a lead, not the verdict", "When in doubt, mark it unverified."] }
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
      { title: "Charge to 80%, not 100%", body: "Lithium batteries last longest at 20-80%. Overnight 100% charges slowly wear out phones over months." },
      { title: "Use adaptive brightness", body: "Let your screen auto-brighten. Same viewable quality with less eye strain and fewer recharges." },
      { title: "Buy certified cables", body: "Cheap cables damage ports and charge slower. Look for USB-IF or MFi marks on your daily drivers." },
      { title: "Back up photos before you need it", body: "Phone storage is finite. Enable auto-backup now — the 'storage full' alert is always late." },
      { title: "Restart your phone weekly", body: "A weekly restart clears junk apps and frees memory. Most 'sluggish' phones perk right back up." },
      { title: "Check battery health on used phones", body: "Used phones lose battery capacity. Run a battery health check before paying top dollar." },
      { title: "Update apps overnight", body: "Set app updates to happen while you sleep, so your phone isn't chugging during the day." },
      { title: "One charger per room", body: "Having a charger everywhere stops the panic charging that wrecks batteries at the end of the day." }
    ],
    howtos: [
      { title: "Extend your phone's battery life", steps: ["Drop brightness or turn on adaptive", "Enable low power mode at 30%", "See which apps drain battery in settings", "Turn off location and broadcast you don't use", "Charge to 80% and carry on."] },
      { title: "Transfer everything to a new phone", steps: ["Back up the old phone first", "Choose 'transfer from old device' during setup", "Scan the QR or pair the two phones", "Let it copy apps, photos, and messages", "Log in as accounts appear — done."] },
      { title: "Free up storage in 10 minutes", steps: ["Open Settings > Storage", "Delete duplicate screenshots and videos", "Filters make this one-tap", "Offload apps you haven't opened in months", "Archive large files and documents."] },
      { title: "Cut digital glare at night", steps: ["Turn on night mode / blue light filter at sunset", "Lower brightness in dark rooms", "Enable dark mode where available", "Keep the phone out of reach of the bed", "Your sleep wins, your eyes thank you."] },
      { title: "Stop apps tracking your every move", steps: ["Settings > Privacy > Location services", "Deny location for apps that don't need it", "Revoke camera and mic access you don't use", "Reset the advertising ID", "You keep your data, apps work the same."] },
      { title: "Set up a better morning phone routine", steps: ["Plug in at night — 80% is fine", "Glance at the lock screen, don't dive in", "Clear junk notifications once per day", "Enable battery saver on your commute", "Arrive with 90% and a clearer head."] }
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
    tags: ["#cybersecurity", "#security", "#privacy", "#cybersectips", "#phishing", "#onlinesafety", "#datasecurity", "#infosec", "#password", "#2fa", "#securetech", "#securitytips"],
    tips: [
      { title: "Use a password manager", body: "Reusing passwords is how accounts get chain-hacked. One manager generates and stores unique ones." },
      { title: "Turn on 2FA everywhere it matters", body: "Second-factor verification stops most account takeovers. Start with email, banking, and socials." },
      { title: "Watch for urgency in emails", body: "Scammers rush you: 'act now' or 'account suspended'. Real companies rarely demand instant panic action." },
      { title: "Verify links before clicking", body: "Hover to preview the real URL. look-alikes like amaz0n.com are social engineering, not typos." },
      { title: "Free WiFi is public", body: "On coffee-shop Wi-Fi, unencrypted traffic is readable. Use a hotspot or VPN for sensitive stuff." },
      { title: "Update or get exploited", body: "Most breaches exploit old, known bugs. Auto-updates close the doors scammers already know." },
      { title: "Beware 'official-looking' SMS", body: "Texts can be spoofed. If a bank text asks for a code, call the real number — never reply." },
      { title: "Lock your screen, always", body: "A locked device is 90% of prevention. Windows key + L at work, biometrics at home." }
    ],
    howtos: [
      { title: "Spot a phishing email in 30 seconds", steps: ["Check the sender address, not just the name", "Hover over links to see the real URL", "Watch for urgency and threats", "Look for typos and odd grammar", "In doubt? Contact the company on a known number."] },
      { title: "Set up 2FA on any account", steps: ["Open Settings > Security > Two-factor", "Prefer an authenticator app over SMS", "Scan the QR with your authenticator", "Save the backup codes somewhere safe", "Test a login with a code before you log out."] },
      { title: "Create a strong, memorable passphrase", steps: ["Pick four random words, e.g. Guitar-Maple-Frost-Cedar", "Keep it long — 16+ characters", "Add symbols only if the site demands it", "Never reuse it elsewhere", "Let your password manager remember the rest."] },
      { title: "Wipe an old phone safely",
        steps: ["Back up what you want to keep", "Sign out of all accounts first", "Turn off Find My Device", "Factory reset — not just delete", "Verify it asks for a fresh setup, then pass it on."],
        details: [
          "A factory reset erases the whole phone — so export photos and messages to your cloud sync, or copy everything to a cable/bluetooth transfer. Skipping this is how the new phone turns out to be missing a year of memories.",
          "Log out of Google, Apple, banking and social apps BEFORE the wipe. An account left signed in can lock the new owner out, and a signed-in session survives on the phone's login data even after some resets.",
          "iOS: Settings > your name > Find My iPhone — switch it off (activation lock ties the phone to your Apple ID after a reset). Android: remove the Google account and disable Find My Device, or the next person can hit a hard FRP lock.",
          "Settings > System > Reset > Erase all data (factory reset). 'Delete' in a file manager only frees space — remnants stay. On iPhone the wipe also unsyncs your iCloud and wipes the list of trusted devices.",
          "A clean wipe boots straight into the 'hello' / fresh-setup screen with no lock or accounts. If it ever asks for a password during setup, the reset didn't fully work — redo it before handing the phone over."
        ] },
      { title: "Lock down your router", steps: ["Log in to your router admin page", "Change the default admin password", "Turn off remote management", "Use WPA2 or WPA3 encryption", "Update the firmware — security patches hide there."] },
      { title: "Clean up data brokers", steps: ["Search yourself on people-search sites", "Use each site's opt-out page", "Remove your listing and note the case ID", "Re-check in 30 days — they re-add", "Switch your email to a spam-safe address."] }
    ],
    routines: [
      { title: "Monday security sweep", steps: ["Install pending security updates", "Check the last logins on your top three accounts", "Revoke sessions you don't recognize", "Confirm 2FA is on for the important ones", "Close the tab — safer than most already."] },
      { title: "Weekly password ritual", steps: ["Never type your bank password into anything that asks", "Rotate the password on your least-trusted site", "Check the manager for weak or reused ones", "Turn on a password breach alert", "Bit by bit, the vault gets stronger."] },
      { title: "Daily 1-minute check", steps: ["Skim notifications for unknown logins", "See an urgent text or email? Pause ten seconds", "Confirm you didn't click anything unusual", "Lock your screen when stepping away", "That's the whole habit — 60 seconds."] },
      { title: "Monthly privacy audit", steps: ["Download an app permission report", "Revoke camera, mic, and location you forgot", "Delete old accounts and saved passwords", "Retire abandoned apps entirely", "Test your 2FA backup codes still work."] }
    ]
  },
  apple: {
    label: "Apple & macOS",
    accent: "#C7E1FF",
    emoji: "🍎",
    tags: ["#apple", "#iphone", "#ipad", "#mac", "#macbook", "#macos", "#ios", "#airpods", "#appletv", "#applewatch", "#applenews", "#appleintelligence", "#siri", "#appstore", "#appleinsider"],
    tips: [
      { title: "Use the hidden trackpad tweak", body: "Three-finger drag (Settings > Trackpad > Accessibility) makes moving windows and selecting text far easier on a MacBook." },
      { title: "iPhone low power mode at 20%", body: "Low Power Mode buys real time when you're out. Turn it on early, not when the phone is already dying." },
      { title: "Batch-delete screenshots", body: "Screenshots pile up fast. Open the Photos screenshot album once a week and wipe what you don't keep." },
      { title: "App Library stops the swipe marathon", body: "On iOS, pull left past your last page to get App Library — instant app search, fewer home screens." },
      { title: "Control Center is the fast lane", body: "Swipe down from the top-right to toggle Wi-Fi, Bluetooth, focus and brightness — no Settings hunting." },
      { title: "Stage Manager when multitasking", body: "On iPad/macOS, Stage Manager groups your active apps so switching between work windows is one click." },
      { title: "Hide the files you drag in", body: "Drag files to the Finder sidebar Dock icon to keep them off your Desktop and out of your screenshots." },
      { title: "Battery health check", body: "Settings > Battery > Battery Health shows real capacity. Do this before buying a used iPhone or iPad." }
    ],
    howtos: [
      { title: "Back up your iPhone before iOS updates", steps: ["Connect to Wi-Fi and power", "Settings > your name > iCloud > iCloud Backup", "Tap Back Up Now — wait for it to finish", "Install the update from Settings > General", "If anything breaks, restore from the backup you just made."] },
      { title: "Free up iPhone storage in 5 minutes", steps: ["Settings > General > iPhone Storage", "Delete the biggest offline videos and games first", "Offload apps you haven't opened in months", "Let iOS offload photos automatically", "Check again in a week — it stays under control."] },
      { title: "Find your MacBook battery drainer", steps: ["Open Activity Monitor (Spotlight > 'Activity Monitor')", "Sort by CPU then by Energy", "Close the browser tab that's silently maxing cores", "Check background apps under the Energy tab", "Dim the screen — the budget display uses the least."] },
      { title: "Get notifications under control on iPhone", steps: ["Settings > Notifications", "Turn off everything that isn't an actual person", "Leave badges only for mail and messages", "Enable Scheduled Summary for the rest", "One quiet morning of work and you'll feel it."] },
      { title: "Set up iCloud Keychain properly", steps: ["Settings > your name > iCloud > Passwords & Keychain", "Turn on Passwords & Keychain", "Add the important logins to it", "Enable it on your Mac too (System Settings > Apple Account)", "Autofill everywhere, one passcode to remember."] },
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
      { title: "SSD over HDD changes everything", body: "Swapping a spinning drive for an SSD is the single biggest speed gain you can buy — boots and apps open in seconds." },
      { title: "RAM is the second cheapest upgrade", body: "If a PC is sluggish with multiple tabs, RAM is usually the pain. 16GB to 32GB is the budget-friendly fix." },
      { title: "Check TDP, not just the chip", body: "A thin laptop with an H-series CPU will throttle. Match the chip to the chassis — U-series for portability, H for sustained work." },
      { title: "NVIDIA/AMD drivers update quietly", body: "Game or work stutters after an update? Keep drivers current, but uninstall old ones cleanly to avoid conflicts." },
      { title: "Discrete vs integrated GPUs", body: "For Office and streaming, integrated GPUs are plenty. You only pay for discrete graphics if you render or game seriously." },
      { title: "Read the panel specs before buying", body: "nits brightness, refresh rate and color gamut matter more than OLED hype. A bright 120Hz panel beats a dim 4K." },
      { title: "Cooling is the real spec", body: "Two similar laptops perform differently under load. Vapor chamber + few watts of fan noise usually means better sustained speed." },
      { title: "Warranty beats cheap parts", body: "A $50 fan upgrade on a 1-year-old gaming laptop is worth it. Laptop repairs without warranty parts are expensive traps." }
    ],
    howtos: [
      { title: "Speed up an old Windows laptop", steps: ["Check disk usage — a full drive kills everything", "Upgrade to an SSD or a RAM module", "Disable startup apps in Task Manager", "Update drivers and firmware from the vendor", "Reinstall Windows 11 clean if it still crawls."] },
      { title: "Check a GPU before you buy a game laptop", steps: ["Look up the laptop model on a benchmark site", "Compare sustained FPS at your target resolution", "Skim the thermal/review notes — throttling hides in reviews", "Confirm total TGP of the GPU quietly in reviews", "Warranty length is the tiebreaker."] },
      { title: "Monitor your laptop's real temps", steps: ["Install a lightweight temp tool (open-source)", "Run a 15-minute stress load or a game", "Watch CPU/GPU temps while under load", "Below 90C sustained is fine; above, clean vents", "Raise the laptop on a stand — bottom airflow helps."] },
      { title: "Set up proper battery care", steps: ["Cap charge at 80% if the vendor offers it", "Avoid leaving it at 100% for weeks", "Occasional deep discharge is fine, not daily", "Keep firmware/battery drivers updated", "A battery at 80% capacity after 2 years is normal."] },
      { title: "Buy a laptop that fits your work", steps: ["List the three applications that slow your current PC", "Match CPU tier and RAM to that list", "Confirm the port needs — USB-C, HDMI, storage", "Get 16GB+ RAM and an SSD minimum", "Buy from a brand with known reliability/warranty."] },
      { title: "Clean a laptop without breaking it", steps: ["Power down and unplug first", "Use compressed air in short bursts on vents", "Wipe the lid with a microfiber and isopropyl", "Never spray liquid directly at ports or fans", "Do it quarterly — dust is the silent throttler."] }
    ],
    routines: [
      { title: "Monthly laptop health check", steps: ["Run a disk check and free 10% drive space", "Update drivers/firmware from the vendor", "Check fan vents and clean light dust", "Glance at temps after a load test", "Log the battery health %. Done in 10 minutes."] },
      { title: "Weekly backup ritual", steps: ["Backup drive or cloud sync your work files", "Verify the last backup date, not just success", "Test one restore of a folder you really need", "Stash critical documents in a second location", "Automate it so you stop thinking about it."] },
      { title: "Quarterly hardware review", steps: ["Compare your current spec to your main apps' needs", "Check if RAM or SSD upgrades are affordable now", "Look up warranty remaining on laptop & battery", "Decide upgrade vs new purchase, with the numbers", "Either way, budget one hour of maintenance weekly."] }
    ]
  }
};

export default { NICHES };