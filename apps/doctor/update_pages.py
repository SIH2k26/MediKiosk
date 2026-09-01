import os
import re

def replace_classes(content):
    # Imports
    content = re.sub(
        r"import Link from 'next/link';",
        "import Link from 'next/link';\nimport { Button } from '../components/ui/button';\nimport { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';\nimport { Input } from '../components/ui/input';\nimport { SeverityBadge } from '../components/ui/severity-badge';\nimport { DataMono } from '../components/ui/data-mono';\nimport { NavItem } from '../components/ui/nav-item';",
        content
    )

    # Risk badge
    content = re.sub(
        r"function riskBadge\(risk: string\) \{[\s\S]*?return <span className=\{map\[risk\] \?\? 'badge badge-normal'\}>\{labels\[risk\] \?\? risk\}</span>;\n\}",
        """function riskBadge(risk: string) {
  const map: Record<string, "critical" | "warning" | "default"> = {
    EMERGENCY:     'critical',
    HIGH_PRIORITY: 'warning',
    WARNING:       'warning',
    NORMAL:        'default',
  };
  const labels: Record<string, string> = {
    EMERGENCY:     '🚨 Emergency',
    HIGH_PRIORITY: '⚠ High Priority',
    WARNING:       '⚡ Warning',
    NORMAL:        '✓ Normal',
  };
  return <SeverityBadge severity={map[risk] ?? 'default'}>{labels[risk] ?? risk}</SeverityBadge>;
}""",
        content
    )
    
    # rowClass
    content = re.sub(
        r"function rowClass\(risk: string\) \{\n  if \(risk === 'EMERGENCY'\)    return 'row-emergency';\n  if \(risk === 'HIGH_PRIORITY'\) return 'row-high';\n  return '';\n\}",
        """function rowClass(risk: string) {
  if (risk === 'EMERGENCY')    return 'bg-signal-critical/5 hover:bg-signal-critical/10 border-l-2 border-signal-critical';
  if (risk === 'HIGH_PRIORITY') return 'bg-signal-warning/5 hover:bg-signal-warning/10 border-l-2 border-signal-warning';
  return 'hover:bg-dark-raised border-l-2 border-transparent';
}""",
        content
    )

    # Replacements dictionary
    replacements = [
        (r'className="portal-layout"', 'className="flex h-screen w-full overflow-hidden bg-dark"'),
        (r'className="sidebar"', 'className="w-64 flex flex-col border-r border-dark-rule bg-dark-raised flex-shrink-0"'),
        (r'className="sidebar-logo"', 'className="flex items-center gap-3 p-5 border-b border-dark-rule"'),
        (r'className="sidebar-logo-icon"', 'className="text-accent"'),
        (r'className="sidebar-logo-name"', 'className="font-semibold text-ink-primary tracking-tight text-lg"'),
        (r'className="sidebar-logo-sub"', 'className="text-xs text-ink-tertiary"'),
        (r'className="sidebar-nav"', 'className="flex-1 overflow-y-auto p-3 flex flex-col gap-1"'),
        (r'className="nav-section-label"', 'className="text-xs font-semibold uppercase tracking-wider text-ink-muted mt-5 mb-2 px-3"'),
        (r'className="sidebar-user-section"', 'className="p-4 border-t border-dark-rule flex flex-col gap-3"'),
        (r'className="sidebar-user-badge"', 'className="flex items-center gap-3 p-3 bg-dark-sunken rounded-lg border border-dark-rule"'),
        (r'className="sidebar-user-avatar"', 'className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm border border-accent/20"'),
        (r'className="sidebar-user-info"', 'className="flex-1 min-w-0"'),
        (r'className="sidebar-user-name"', 'className="text-sm font-semibold truncate text-ink-primary"'),
        (r'className="sidebar-user-role"', 'className="text-xs text-ink-tertiary truncate uppercase tracking-wider font-medium"'),
        (r'className="portal-main"', 'className="flex-1 flex flex-col overflow-hidden bg-dark"'),
        (r'className="portal-topbar"', 'className="flex items-center justify-between p-6 border-b border-dark-rule bg-dark-raised flex-shrink-0"'),
        (r'className="portal-topbar-title"', 'className="text-2xl font-semibold text-ink-primary tracking-tight"'),
        (r'className="portal-topbar-sub"', 'className="text-sm text-ink-secondary mt-1"'),
        (r'className="portal-topbar-right"', 'className="flex items-center gap-5"'),
        (r'className="topbar-avatar"', 'className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm border border-accent/20"'),
        (r'className="status-dot"', 'className="w-2 h-2 rounded-full bg-[#10B981]"'),
        (r'className="portal-content"', 'className="flex-1 overflow-y-auto p-6 flex flex-col gap-6"'),
        (r'className="stats-grid fade-in"', 'className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in"'),
        (r'<div className="stat-card"([^>]*)>', r'<Card className="p-5 flex flex-col gap-2"\1>'),
        (r'className="stat-label"', 'className="text-sm text-ink-secondary font-medium"'),
        (r'className="stat-value"', 'className="text-3xl font-semibold text-ink-primary"'),
        (r'<div className="card fade-in fade-in-1">', '<Card className="flex flex-col animate-in fade-in slide-in-from-bottom-2">'),
        (r'<div className="card-header">', '<CardHeader className="flex flex-row items-center justify-between border-b border-dark-rule pb-4">'),
        (r'<h2 className="card-title">', '<CardTitle>'),
        (r'<table className="queue-table" role="table"', '<table className="w-full text-left text-sm" role="table"'),
        (r'<thead>', '<thead className="border-b border-dark-rule text-ink-muted text-xs uppercase tracking-wider bg-dark-sunken">'),
        (r'<th scope="col">', '<th scope="col" className="px-4 py-3 font-medium">'),
        (r'<td>', '<td className="px-4 py-3 border-b border-dark-rule">'),
        (r'<td style=\{(.*?)\}>', r'<td className="px-4 py-3 border-b border-dark-rule" style={\1}>'),
        (r'className="modal-backdrop"', 'className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in"'),
        (r'className="modal-panel"', 'className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-dark border border-dark-ruleStrong shadow-2xl overflow-hidden animate-in zoom-in-95"'),
        (r'className="modal-header"', 'className="flex items-start justify-between p-6 border-b border-dark-rule bg-dark-raised"'),
        (r'className="modal-body"', 'className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 bg-dark"'),
        (r'className="modal-footer"', 'className="flex items-center justify-between p-6 border-t border-dark-rule bg-dark-raised"'),
        (r'className="modal-section-label"', 'className="block text-xs font-semibold text-ink-secondary mb-2 uppercase tracking-wider"'),
        (r'<input\s+id="([^"]+)"\s+type="text"\s+className="form-input"', r'<Input id="\1" type="text" '),
        (r'<textarea\s+id="([^"]+)"\s+className="form-input"', r'<textarea id="\1" className="flex w-full rounded-md border border-dark-rule bg-dark-sunken px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent" '),
        (r'className="alert alert-success"', 'className="flex items-center gap-2 p-4 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] rounded-lg text-sm font-medium"'),
        (r'className="ai-label"', 'className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent border border-accent/20"'),
        
        # Buttons
        (r'className="btn btn-primary"', 'className="btn-primary"'),
        (r'<button\s+className="btn-primary"([^>]*)>', r'<Button variant="default"\1>'),
        
        (r'className="btn btn-secondary"', 'className="btn-secondary"'),
        (r'<button\s+className="btn-secondary"([^>]*)>', r'<Button variant="outline"\1>'),
        
        (r'className="btn btn-ghost"', 'className="btn-ghost"'),
        (r'<button\s+className="btn-ghost"([^>]*)>', r'<Button variant="ghost"\1>'),
        
        (r'className="nav-item nav-item-signout"', 'className="nav-item-signout"'),
        (r'<button\s+id="doctor-signout-btn"\s+className="nav-item-signout"([^>]*)>', r'<Button id="doctor-signout-btn" variant="ghost" className="w-full justify-start text-[#FCA5A5] hover:text-[#F87171] hover:bg-[#FCA5A5]/10 gap-2"\1>'),
    ]

    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)

    # Wrap NavItems with Link for active navs
    content = re.sub(
        r'<Link href="([^"]+)" className="nav-item active" aria-current="page">\s*(.*?)\s*</Link>',
        r'<Link href="\1" passHref legacyBehavior><NavItem active aria-current="page">\2</NavItem></Link>',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'<Link href="([^"]+)" className="nav-item">\s*(.*?)\s*</Link>',
        r'<Link href="\1" passHref legacyBehavior><NavItem>\2</NavItem></Link>',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'<a href="([^"]+)" className="nav-item" target="_blank" rel="noopener noreferrer">\s*(.*?)\s*</a>',
        r'<NavItem href="\1" target="_blank" rel="noopener noreferrer">\2</NavItem>',
        content,
        flags=re.DOTALL
    )

    # Remove extra closing tags for Card if they were changed from div
    content = content.replace('</div>\n            <div style={{ overflowX: \'auto\' }}>', '</CardHeader>\n            <CardContent className="p-0 overflow-x-auto">')
    content = content.replace('</table>\n            </div>\n          </div>', '</table>\n            </CardContent>\n          </Card>')
    
    # Also DataMono
    content = re.sub(
        r'<span style={{ fontFamily: \'var\(--font-display\)\', fontWeight: 700, fontSize: \'0.875rem\', color: \'var\(--color-primary\)\' }}>\s*(.*?)\s*</span>',
        r'<DataMono>\1</DataMono>',
        content
    )

    return content

# Process page.tsx
with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/page.tsx', 'r', encoding='utf-8') as f:
    page_content = f.read()

page_content = replace_classes(page_content)

with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(page_content)

print("page.tsx updated")

# Process triage/page.tsx
with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/triage/page.tsx', 'r', encoding='utf-8') as f:
    triage_content = f.read()

triage_content = replace_classes(triage_content)
# triage specific things
triage_content = re.sub(
    r'className="card fade-in"',
    'className="animate-in fade-in slide-in-from-bottom-2"',
    triage_content
)
triage_content = re.sub(
    r'<div\s+key=\{alert\.id\}\s+className="card"',
    r'<Card key={alert.id}',
    triage_content
)
triage_content = triage_content.replace('className="badge badge-${alert.riskLevel.toLowerCase().replace(\'_\', \'-\')}"', '')

with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/triage/page.tsx', 'w', encoding='utf-8') as f:
    f.write(triage_content)

print("triage/page.tsx updated")
