with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Card endings
content = content.replace('<Card className="p-5 flex flex-col gap-2">\n              <div className="text-sm text-ink-secondary font-medium">In Queue</div>\n              <div className="text-3xl font-semibold text-ink-primary">{totalWaiting}</div>\n            </div>', '<Card className="p-5 flex flex-col gap-2">\n              <div className="text-sm text-ink-secondary font-medium">In Queue</div>\n              <div className="text-3xl font-semibold text-ink-primary">{totalWaiting}</div>\n            </Card>')

content = content.replace('<Card className="p-5 flex flex-col gap-2" style={{ borderColor: emergency > 0 ? \'rgba(239,68,68,0.4)\' : undefined }}>\n              <div className="text-sm text-ink-secondary font-medium">🚨 Emergency</div>\n              <div className="text-3xl font-semibold text-ink-primary" style={{ color: emergency > 0 ? \'#FCA5A5\' : undefined }}>{emergency}</div>\n            </div>', '<Card className="p-5 flex flex-col gap-2" style={{ borderColor: emergency > 0 ? \'rgba(239,68,68,0.4)\' : undefined }}>\n              <div className="text-sm text-ink-secondary font-medium">🚨 Emergency</div>\n              <div className="text-3xl font-semibold text-ink-primary" style={{ color: emergency > 0 ? \'#FCA5A5\' : undefined }}>{emergency}</div>\n            </Card>')

content = content.replace('<Card className="p-5 flex flex-col gap-2" style={{ borderColor: highPriority > 0 ? \'rgba(245,158,11,0.4)\' : undefined }}>\n              <div className="text-sm text-ink-secondary font-medium">⚠ High Priority</div>\n              <div className="text-3xl font-semibold text-ink-primary" style={{ color: highPriority > 0 ? \'#FCD34D\' : undefined }}>{highPriority}</div>\n            </div>', '<Card className="p-5 flex flex-col gap-2" style={{ borderColor: highPriority > 0 ? \'rgba(245,158,11,0.4)\' : undefined }}>\n              <div className="text-sm text-ink-secondary font-medium">⚠ High Priority</div>\n              <div className="text-3xl font-semibold text-ink-primary" style={{ color: highPriority > 0 ? \'#FCD34D\' : undefined }}>{highPriority}</div>\n            </Card>')

content = content.replace('<Card className="p-5 flex flex-col gap-2">\n              <div className="text-sm text-ink-secondary font-medium">System Status</div>\n              <div className="text-3xl font-semibold text-ink-primary" style={{ color: \'var(--color-primary)\', fontSize: \'1.25rem\', display: \'flex\', alignItems: \'center\', gap: \'0.5rem\', paddingTop: \'0.25rem\' }}>\n                <div className="w-2 h-2 rounded-full bg-[#10B981]" aria-hidden="true" />\n                Active\n              </div>\n            </div>', '<Card className="p-5 flex flex-col gap-2">\n              <div className="text-sm text-ink-secondary font-medium">System Status</div>\n              <div className="text-3xl font-semibold text-ink-primary" style={{ color: \'var(--color-primary)\', fontSize: \'1.25rem\', display: \'flex\', alignItems: \'center\', gap: \'0.5rem\', paddingTop: \'0.25rem\' }}>\n                <div className="w-2 h-2 rounded-full bg-[#10B981]" aria-hidden="true" />\n                Active\n              </div>\n            </Card>')

content = content.replace('<CardTitle>Patient OPD Queue</h2>', '<CardTitle>Patient OPD Queue</CardTitle>')
content = content.replace('</Button>\n            </div>', '</Button>\n            </CardHeader>')
content = content.replace('<div style={{ overflowX: \'auto\' }}>', '<CardContent className="p-0 overflow-x-auto">')

# Main tag in page.tsx
content = content.replace('</div>\n      </main>\n\n      {/* ── Patient Clinical Dossier Modal ── */}', '</Card>\n        </div>\n      </main>\n\n      {/* ── Patient Clinical Dossier Modal ── */}')

with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/triage/page.tsx', 'r', encoding='utf-8') as f:
    tcontent = f.read()

# Main tag in triage page
tcontent = tcontent.replace('</div>\n      </main>\n    </div>', '</div>\n      </main>\n    </div>')
# Fix closing tags for card in triage
import re
tcontent = re.sub(
    r'<Card key=\{alert\.id\}\n(.*?)</Button>\n                      </div>',
    r'<Card key={alert.id}\n\1</Button>\n                      </Card>',
    tcontent, flags=re.DOTALL
)

with open('c:/Users/ANSH DARJI/Documents/Medikiosk/apps/doctor/app/triage/page.tsx', 'w', encoding='utf-8') as f:
    f.write(tcontent)

