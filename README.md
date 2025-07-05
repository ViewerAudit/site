# Viewer Audit 🔍

A powerful web application that detects viewbotters on Twitch and Kick by analyzing viewer engagement metrics and providing botting likelihood scores in real-time.

![Viewer Audit](https://img.shields.io/badge/Viewer%20Audit-Live%20Analysis-blue)
![Platform](https://img.shields.io/badge/Platform-Twitch%20%7C%20Kick-purple)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🔍 **Smart Search & Discovery**
- **Autocomplete Search**: Real-time channel suggestions as you type
- **Platform Toggle**: Switch between Twitch and Kick seamlessly
- **URL Support**: Paste channel URLs directly
- **Cross-Platform Search**: Search across both platforms simultaneously
- **Recent Searches**: Quick access to your search history

### 📊 **Comprehensive Analysis**
- **Live Viewer Count**: Real-time viewer statistics
- **Active Chatters**: Monitor chat engagement
- **Follower Metrics**: Track follower-to-viewer ratios
- **Stream Duration**: Analyze stream uptime patterns
- **Chat Message Rate**: Measure engagement levels
- **Viewer-to-Chatter Ratio**: Key botting indicator

### 🤖 **Botting Detection**
- **AI-Powered Algorithm**: Advanced botting likelihood scoring
- **Detailed Explanations**: Understand why a channel is flagged
- **Multiple Indicators**: Analyzes various engagement patterns
- **Real-Time Updates**: Live data for accurate analysis

### 💖 **User Features**
- **Favorites System**: Save channels with heart button
- **Cross-Platform Comparison**: Compare channels side-by-side
- **Social Sharing**: Share results on social media
- **Mobile Responsive**: Works perfectly on all devices
- **Real-Time Updates**: Live data refreshing

### 📈 **Data Visualization**
- **Interactive Charts**: SVG-based visualizations
- **Engagement Graphs**: Visual representation of metrics
- **Comparison Charts**: Side-by-side analysis
- **Real-Time Charts**: Live updating visualizations

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required - runs entirely in the browser

### Live Demo
Visit the live application: [Viewer Audit](https://your-username.github.io/ViewerAudit)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ViewerAudit.git
   cd ViewerAudit
   ```

2. **Open in browser**
   ```bash
   # Using Python (if installed)
   python -m http.server 8000
   
   # Using Node.js (if installed)
   npx serve .
   
   # Or simply open index.html in your browser
   ```

3. **Access the application**
   - Navigate to `http://localhost:8000` (if using server)
   - Or open `index.html` directly in your browser

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic structure and accessibility
- **CSS3**: Modern styling with animations and responsive design
- **Vanilla JavaScript**: ES6+ features, modules, and modern APIs
- **SVG Graphics**: Custom logos, icons, and data visualizations

### APIs & Data
- **Twitch API**: Official Twitch API integration
- **Kick API**: Official Kick API integration
- **Real-Time Data**: Live streaming data and metrics
- **No Mock Data**: All real-time information

### Features
- **Progressive Web App**: PWA capabilities
- **Service Worker**: Offline functionality
- **Local Storage**: Device-based data persistence
- **Responsive Design**: Mobile-first approach

## 📱 Mobile Support

The application is fully responsive and optimized for:
- 📱 **Mobile Phones**: Touch-friendly interface
- 📱 **Tablets**: Optimized layouts
- 💻 **Desktop**: Full-featured experience
- 🖥️ **Large Screens**: Enhanced visualizations

## 🔧 Configuration

### API Credentials
The application uses the following API credentials:

**Twitch API:**
- Client ID: `m3y8neekuu7dcjzb9tluw4zwwmxcuj`
- Secret: `355k5929537n9hal9gbnz2sjzvjwt3`

**Kick API:**
- Client ID: `01JVJNAY16ZC1ZPSE511C7EJFY`
- Secret: `f4f97e275e9a4a85b51101ed3986d723f0486d33abc7ed982790688f4b2086b2`

### Customization
You can customize the application by modifying:
- `css/main.css` - Main styling
- `css/components.css` - Component styles
- `css/responsive.css` - Responsive design
- `js/api.js` - API configuration
- `js/utils.js` - Utility functions

## 🚀 Deployment

### GitHub Pages (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings
   - Navigate to Pages section
   - Select source: "Deploy from a branch"
   - Choose branch: "gh-pages"
   - Save

3. **Automatic Deployment**
   - The GitHub Actions workflow will automatically deploy on push
   - Your site will be available at: `https://your-username.github.io/ViewerAudit`

### Other Hosting Options

- **Netlify**: Drag and drop the folder to Netlify
- **Vercel**: Connect your GitHub repository
- **Firebase Hosting**: Use Firebase CLI
- **Any Static Host**: Upload files to any static hosting service

## 📊 Botting Detection Algorithm

The application uses a sophisticated algorithm that analyzes:

1. **Viewer-to-Chatter Ratio**: Suspicious if very high
2. **Chat Message Rate**: Unusually low = potential bots
3. **Engagement Patterns**: Inconsistent activity
4. **Follower-to-Viewer Ratio**: Unrealistic ratios
5. **Stream Duration vs Viewers**: Sudden spikes
6. **Chat Quality**: Bot-like messages

### Scoring System
- **Low Risk (0-30%)**: Normal engagement patterns
- **Medium Risk (31-70%)**: Some suspicious indicators
- **High Risk (71-100%)**: Multiple botting indicators

## 🔒 Privacy & Security

- **No User Accounts**: Completely anonymous
- **Local Storage**: Data saved on your device only
- **No Personal Data**: Only public streaming data
- **Secure APIs**: Official platform APIs only
- **No Tracking**: No analytics or tracking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use consistent indentation
- Follow JavaScript ES6+ standards
- Maintain responsive design
- Add comments for complex logic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Twitch API**: For providing streaming data
- **Kick API**: For platform integration
- **Inter Font**: For beautiful typography
- **SVG Icons**: For custom graphics

## 📞 Support

If you encounter any issues or have questions:

1. **Check the FAQ**: Visit the FAQ page in the application
2. **GitHub Issues**: Create an issue on GitHub
3. **Documentation**: Review this README

## 🔄 Updates

The application is actively maintained and updated with:
- New features and improvements
- Bug fixes and optimizations
- Platform API updates
- Security enhancements

---

**Made with ❤️ for the streaming community**

*Viewer Audit - Detect viewbotters, protect the community* 