import re

with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/triage/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('</button>', '</Button>')
content = re.sub(
    r'<span >\s*\{risk\.label\}\s*</span>',
    r'<SeverityBadge severity={alert.riskLevel === "EMERGENCY" ? "critical" : alert.riskLevel === "HIGH_PRIORITY" || alert.riskLevel === "WARNING" ? "warning" : "default"}>{risk.label}</SeverityBadge>',
    content
)

content = content.replace(
    'className="animate-in fade-in slide-in-from-bottom-2"',
    'className="animate-in fade-in slide-in-from-bottom-2 border rounded-lg shadow-card"'
)

with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/triage/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# And fix page.tsx button closing tags just in case
with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/page.tsx', 'r', encoding='utf-8') as f:
    pcontent = f.read()

pcontent = pcontent.replace('</button>', '</Button>')
with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(pcontent)

print("done")
