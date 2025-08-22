# Claude Code Documentation Folder

This folder contains comprehensive documentation and context for Claude Code interactions with the StudyMaster PWA project.

## 📁 File Structure

### 🤖 [`CLAUDE.md`](./CLAUDE.md)
**Main documentation file** - Complete project overview, architecture, security rules, and development guidelines. Start here for comprehensive understanding of the project.

### 🧠 [`memory.md`](./memory.md)
**Persistent memory** - Critical security rules and key project information that must be remembered across all Claude sessions. Contains the most important guidelines and constraints.

### 📊 [`context.md`](./context.md)
**Current project state** - Real-time status, recent changes, active features, known issues, and immediate priorities. Updated regularly to reflect project evolution.

### ⚡ [`commands.md`](./commands.md)
**Common workflows** - Frequently used commands, development workflows, debugging procedures, and emergency response protocols. Practical reference for daily development tasks.

## 🎯 Purpose

These files serve as:
- **Onboarding material** for new developers
- **Reference documentation** for complex procedures  
- **Security guidelines** to prevent credential leaks
- **Historical context** about project decisions
- **Emergency procedures** for incident response

## 🔄 Maintenance

### When to Update
- **After major feature additions**
- **Following security incidents**
- **During deployment changes**
- **When adding new team members**

### Update Guidelines
1. **Keep security rules current** and prominent
2. **Update project status** after significant changes
3. **Add new commands** as workflows evolve
4. **Document lessons learned** from incidents

## 🚨 Security Notice

This folder contains **CRITICAL SECURITY INFORMATION**. All files emphasize:
- Never committing API keys to Git
- Using deployment platform environment variables
- Keeping production credentials in excluded files
- Following secure development practices

## 📞 Quick Reference

| Need | File | Section |
|------|------|---------|
| Project overview | `CLAUDE.md` | Project Overview |
| Security rules | `memory.md` | Critical Security Rules |
| Current status | `context.md` | Current Project State |
| Command reference | `commands.md` | Development Commands |
| Emergency help | `commands.md` | Emergency Commands |

---

**⚠️ Important**: Always read the security rules in `memory.md` before making any changes to the project.