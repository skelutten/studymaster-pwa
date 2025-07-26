# Development Troubleshooting

Common issues and solutions for StudyMaster PWA development.

## 🚨 Common Issues

### Port Already in Use

**Problem**: Error message "Port 3000/3001 is already in use"

**Solution**:
```bash
# Check what's using the ports (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill processes if needed (Windows)
taskkill /PID <process_id> /F

# Check what's using the ports (macOS/Linux)
lsof -ti:3000
lsof -ti:3001

# Kill processes if needed (macOS/Linux)
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:3001)
```

### Dependencies Issues

**Problem**: Module not found errors or dependency conflicts

**Solution**:
```bash
# Clean install all dependencies
npm run clean
npm run install:all

# Or manually clean and reinstall
rm -rf node_modules client/node_modules server/node_modules shared/node_modules
rm package-lock.json client/package-lock.json server/package-lock.json shared/package-lock.json
npm install
```

### Hot Reload Not Working

**Problem**: Changes not reflecting in the browser

**Solutions**:
- Ensure you're editing files within the `src/` directories
- Check that file extensions are supported (.tsx, .ts, .css)
- Verify development servers are running without errors
- Clear browser cache and hard refresh (Ctrl+F5)
- Check for TypeScript compilation errors in terminal

### Database Connection Issues

**Problem**: Cannot connect to Supabase or database errors

**Solutions**:
- Verify environment variables in `server/.env`
- Check Supabase project status and credentials
- Ensure database schema is up to date
- Check network connectivity and firewall settings

### Build Errors

**Problem**: Build fails with TypeScript or compilation errors

**Solutions**:
```bash
# Check for TypeScript errors
npm run lint

# Clean build directories
npm run clean
npm run build

# Check individual package builds
cd client && npm run build
cd server && npm run build
cd shared && npm run build
```

### Environment Variable Issues

**Problem**: Environment variables not loading correctly

**Solutions**:
- Verify `.env` files exist and have correct format
- Check variable names match exactly (case-sensitive)
- Restart development servers after changing `.env` files
- Ensure `.env` files are not committed to Git

## 🔧 Development Tools

### Debugging

**Client Debugging**:
- Use React Developer Tools browser extension
- Check browser console for errors
- Use Vite's built-in error overlay
- Enable source maps for debugging

**Server Debugging**:
- Check terminal output for server errors
- Use `console.log` for debugging (temporary)
- Use Node.js debugger with VS Code
- Check API responses with tools like Postman

### Performance Issues

**Slow Development Server**:
- Check if antivirus is scanning node_modules
- Exclude project directory from real-time scanning
- Use SSD storage for better performance
- Close unnecessary applications

**Memory Issues**:
- Restart development servers periodically
- Check for memory leaks in code
- Monitor system resources
- Consider increasing Node.js memory limit

## 🐛 Getting Help

### Before Asking for Help

1. **Check the terminal output** for detailed error messages
2. **Verify all prerequisites** are installed correctly
3. **Ensure ports 3000 and 3001** are available
4. **Review recent changes** that might have caused the issue
5. **Check this troubleshooting guide** for similar issues

### Where to Get Help

- **Documentation**: [docs/](../README.md)
- **GitHub Issues**: Report bugs and get community help
- **Development Guide**: [README.md](README.md)
- **Community Discord**: Join our developer community

### Reporting Issues

When reporting issues, include:
- **Operating system** and version
- **Node.js and npm versions**
- **Complete error messages** from terminal
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Recent changes** made to the codebase

## 📝 Debugging Tips

### Useful Commands

```bash
# Check versions
node --version
npm --version

# Check running processes
npm run dev:verbose  # Start with detailed logging

# Test individual components
npm run test:client
npm run test:server

# Check linting
npm run lint:client
npm run lint:server
```

### Environment Debugging

```bash
# Print environment variables (be careful with secrets!)
echo $NODE_ENV
echo $PORT

# Check if files exist
ls -la server/.env
ls -la client/.env
```

---

**Still having issues?** Don't hesitate to ask for help in our community channels!