# Wiki Masters Automation Bot - Design Document

**Date:** 2026-09-24  
**Status:** Approved  
**Author:** Claude Sonnet 4.5

## Overview

This document describes the design for a Python Selenium automation script that automates card pack opening on the Wiki Masters website (wiki-masters.com). The script runs indefinitely in headless mode, checking for available card packs, executing the opening sequence when packs are available, and waiting when they are not.

## Goals

- Automate the login process to wiki-masters.com
- Continuously check for available card packs
- Execute the card opening sequence when packs are available
- Wait intelligently when no packs are available
- Run indefinitely until manually stopped
- Provide comprehensive logging for monitoring and debugging
- Handle errors gracefully with proper cleanup

## Non-Goals

- GUI interface for configuration
- Multi-account support
- Card data collection or storage
- Integration with external services
- Distributed or parallel execution

## Architecture Overview

The script uses a modular class-based architecture with clear separation of concerns:

```
WikiMastersBot (Main Orchestrator)
├── BrowserManager (WebDriver lifecycle)
├── LoginHandler (Authentication)
└── CardDeckHandler (Card pack interactions)
```

### Main Components

**1. WikiMastersBot**
- Main orchestrator class that runs the infinite loop
- Coordinates all other components
- Handles top-level error handling and graceful shutdown
- Manages the availability check and wait logic

**2. BrowserManager**
- Initializes and configures Chrome WebDriver in headless mode
- Manages browser lifecycle (creation and cleanup)
- Uses webdriver-manager for automatic ChromeDriver management

**3. LoginHandler**
- Handles the one-time authentication flow
- Navigates through signup page to login
- Verifies successful login by checking URL

**4. CardDeckHandler**
- Checks pack availability (detects "0 / 10 paquets disponibles" message)
- Executes the card opening sequence when packs are available
- Handles all card deck interactions with proper waits

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ START                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ BrowserManager: Create headless Chrome instance             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ LoginHandler: Authenticate (one time)                        │
│  1. Navigate to signup page                                  │
│  2. Click "se connecter"                                     │
│  3. Enter credentials (ghermanih@gmail.com / oN2eQB36!)     │
│  4. Verify navigation to /pulls page                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ MAIN LOOP (infinite)                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CardDeckHandler: Check pack availability                │ │
│ │ Look for "0 / 10 paquets disponibles" message           │ │
│ └────────────────────┬────────────────────────────────────┘ │
│                      │                                        │
│         ┌────────────┴────────────┐                          │
│         │                         │                          │
│         ▼                         ▼                          │
│   [AVAILABLE]              [NOT AVAILABLE]                   │
│         │                         │                          │
│         │                         │                          │
│         ▼                         ▼                          │
│ ┌─────────────────┐     ┌────────────────────────────────┐  │
│ │ Execute Sequence│     │ Log "No packs available"       │  │
│ │ 1. Click Ouvrir │     │ Wait 11-15 minutes (random)    │  │
│ │ 2. Click → 4x   │     └────────────┬───────────────────┘  │
│ │ 3. Click        │                  │                      │
│ │    Continuer    │                  │                      │
│ └────────┬────────┘                  │                      │
│          │                           │                      │
│          ▼                           │                      │
│ ┌─────────────────┐                 │                      │
│ │ Log completion  │                 │                      │
│ └────────┬────────┘                 │                      │
│          │                           │                      │
│          └───────────────────────────┘                      │
│                      │                                        │
│                      └──────── Loop back ──────────          │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### BrowserManager

**Responsibilities:**
- Initialize Chrome WebDriver with headless configuration
- Provide browser instance to other components
- Clean up browser resources on shutdown

**Configuration:**
- Headless mode enabled
- Window size: 1920x1080
- Disable GPU acceleration (for stability in headless mode)
- No sandbox mode (for compatibility)
- Uses ChromeDriverManager for automatic driver version management

**Methods:**
- `__init__()`: Creates and configures Chrome WebDriver
- `get_driver()`: Returns the WebDriver instance
- `quit()`: Closes browser and cleans up resources

### LoginHandler

**Responsibilities:**
- Navigate to the login page
- Enter credentials and submit
- Verify successful authentication

**Flow:**
1. Navigate to `https://www.wiki-masters.com/signup`
2. Wait for and click "se connecter" button
3. Wait for email field, enter `ghermanih@gmail.com`
4. Wait for password field, enter `oN2eQB36!`
5. Submit the form
6. Wait for navigation to `https://www.wiki-masters.com/pulls`
7. Verify URL to confirm successful login

**Methods:**
- `login(driver)`: Executes the complete login flow

**Timing:**
- Random 2-7 second delays between each action
- Explicit waits (up to 10 seconds) for each element

### CardDeckHandler

**Responsibilities:**
- Check if card packs are available
- Execute the card opening sequence when packs are available

**Availability Check:**
- Searches for text containing "0 / 10 paquets disponibles"
- Returns `True` if message is found (no packs available)
- Returns `False` if message is not found (packs available)

**Sequence Execution:**
1. Click "Ouvrir" button
2. Loop 4 times:
   - Find the right arrow button (SVG with polyline points="9 18 15 12 9 6")
   - Click the button
   - Random delay 2-7 seconds
3. Click "continuer" button

**Methods:**
- `check_availability(driver)`: Returns boolean indicating if packs are unavailable
- `execute_card_sequence(driver)`: Executes the full opening sequence

**Element Selection Strategy:**
- "Ouvrir" button: By text content
- Right arrow button: By SVG polyline points attribute
- "Continuer" button: By text content
- All elements use explicit waits with WebDriverWait

### WikiMastersBot

**Responsibilities:**
- Orchestrate the entire automation flow
- Manage the infinite loop
- Handle errors and graceful shutdown
- Coordinate timing between components

**Main Loop Logic:**
```python
while True:
    if CardDeckHandler.check_availability():
        log("No packs available, waiting...")
        wait(random 11-15 minutes)
    else:
        CardDeckHandler.execute_card_sequence()
        log("Sequence completed, checking again...")
```

**Methods:**
- `__init__()`: Initialize all components
- `run()`: Main execution loop
- `shutdown()`: Clean up resources and exit

**Error Handling:**
- Catch all exceptions in main loop
- Log full traceback
- Take screenshot (`error_screenshot.png`)
- Clean up browser resources
- Exit with error code

**Graceful Shutdown:**
- Handle KeyboardInterrupt (Ctrl+C)
- Log shutdown event
- Clean up browser resources
- Exit cleanly

## Data Flow & State Management

### State Management
- **Stateless Design**: No persistent state between iterations
- **Session State**: Browser session maintained throughout (stays logged in)
- Each availability check is independent
- No database or file-based state storage

### Data Flow
1. User starts script → Browser created
2. Login executed once → Session cookie stored in browser
3. Main loop begins → Continuous availability checks
4. Each check queries current page state fresh
5. No data persistence between checks

## Error Handling

### Error Categories

**1. Element Not Found**
- Scenario: Page structure changed, element selector invalid
- Handling: Log error with element details, take screenshot, exit
- Recovery: Manual intervention required to update selectors

**2. Timeout Errors**
- Scenario: Page loads slowly, element takes too long to appear
- Handling: Log timeout details, take screenshot, exit
- Recovery: Check network connectivity, website status

**3. Login Failures**
- Scenario: Invalid credentials, website down, captcha added
- Handling: Detect by checking if /pulls page is reached, log error, exit
- Recovery: Verify credentials, check website accessibility

**4. Network Issues**
- Scenario: Internet disconnection, website down
- Handling: Selenium will throw exception, logged and script exits
- Recovery: Restart script when network is restored

**5. Stale Element Reference**
- Scenario: Page refreshed or DOM updated between finding and clicking element
- Handling: Implicit retry through explicit waits with expected_conditions
- Recovery: Automatic via Selenium's wait mechanisms

### Screenshot on Error
- Captured whenever an exception occurs
- Saved as `error_screenshot.png` in script directory
- Shows exact page state when error occurred
- Overwrites previous screenshot (only keeps most recent)

### Logging Strategy
- All errors logged with full traceback
- Timestamp included in all log entries
- Both console and file logging enabled
- DEBUG level for file, INFO level for console

## Logging

### Configuration
- **Logger Name**: `WikiMastersBot`
- **File**: `wiki_masters_bot.log` in script directory
- **Format**: `[YYYY-MM-DD HH:MM:SS] LEVEL: Message`
- **Console Level**: INFO
- **File Level**: DEBUG
- **Rotation**: RotatingFileHandler
  - Max size: 5 MB per file
  - Backup count: 3 files
  - Prevents unlimited disk usage

### Log Events

**Startup:**
- Script started
- Browser initialized
- Login attempt
- Login success/failure

**Main Loop:**
- Availability check results
- "Packs available, executing sequence..."
- "No packs available, waiting N minutes..."
- Sequence completion
- Wait periods started/completed

**Actions:**
- Each major action (click Ouvrir, click arrow, click continuer)
- Random delay durations

**Shutdown:**
- User-initiated shutdown (Ctrl+C)
- Error-triggered shutdown with exception details
- Browser cleanup

**Errors:**
- Full exception traceback
- Screenshot saved notification
- Element that caused error
- Current URL when error occurred

## Dependencies & Installation

### Required Libraries
```
selenium>=4.0.0
webdriver-manager>=3.8.0
```

### Python Version
- Python 3.7 or higher
- Uses f-strings, type hints (optional), modern syntax

### Installation Steps
1. Ensure Python 3.7+ is installed
2. Create `requirements.txt` with dependencies listed above
3. Run: `pip install -r requirements.txt`
4. No manual ChromeDriver installation needed (handled by webdriver-manager)

### System Requirements
- Chrome/Chromium browser installed
- Internet connection
- ~100MB disk space for Chrome, ChromeDriver, and logs
- Works on: Linux, macOS, Windows

## Configuration

### User-Configurable Constants
All located at the top of the script:

```python
# Credentials
EMAIL = "ghermanih@gmail.com"
PASSWORD = "oN2eQB36!"

# URLs
SIGNUP_URL = "https://www.wiki-masters.com/signup"
PULLS_URL = "https://www.wiki-masters.com/pulls"

# Timing (in seconds)
ACTION_DELAY_MIN = 2
ACTION_DELAY_MAX = 7
WAIT_WHEN_NO_PACKS_MIN = 660  # 11 minutes
WAIT_WHEN_NO_PACKS_MAX = 900  # 15 minutes

# Browser
HEADLESS_MODE = True
WINDOW_WIDTH = 1920
WINDOW_HEIGHT = 1080

# Waits (in seconds)
EXPLICIT_WAIT_TIMEOUT = 10
```

### Modifying Behavior
- **Timing**: Adjust delay constants
- **Headless Mode**: Set `HEADLESS_MODE = False` for visible browser
- **Credentials**: Update EMAIL and PASSWORD constants
- **Selectors**: If website changes, update element selectors in respective handler classes

## Testing & Validation

### Manual Testing Checklist

**Initial Setup:**
1. Install dependencies
2. Verify Chrome is installed
3. Run script with `HEADLESS_MODE = False` first time

**Login Testing:**
1. Verify navigation to signup page
2. Verify "se connecter" button is found and clicked
3. Verify credentials are entered correctly
4. Verify successful navigation to /pulls page

**Availability Check Testing:**
1. Verify detection of "0 / 10 paquets disponibles" message
2. Verify correct wait behavior when no packs available
3. Verify immediate execution when packs available

**Sequence Testing:**
1. Verify "Ouvrir" button is clicked
2. Verify right arrow is clicked exactly 4 times
3. Verify "continuer" button is clicked after arrows
4. Verify random delays occur between actions

**Error Handling Testing:**
1. Test with wrong credentials (should fail gracefully)
2. Disconnect network mid-run (should log error and exit)
3. Press Ctrl+C (should shut down gracefully)
4. Verify screenshot is saved on errors
5. Verify logs are written to file

**Logging Testing:**
1. Verify console output is readable
2. Verify log file is created
3. Verify log rotation works (when file exceeds 5MB)
4. Verify timestamps are accurate

### Production Deployment

**Running the Script:**
```bash
python wiki_masters_bot.py
```

**Background Execution (Linux/Mac):**
```bash
# Using nohup
nohup python wiki_masters_bot.py &

# Using screen
screen -S wiki_bot
python wiki_masters_bot.py
# Detach with Ctrl+A, D
```

**Monitoring:**
```bash
# Watch log file in real-time
tail -f wiki_masters_bot.log

# Check if process is running
ps aux | grep wiki_masters_bot
```

**Stopping:**
- Foreground: Press Ctrl+C
- Background: `kill <PID>` or `killall python`

## File Structure

```
/Users/hichamghermani/Desktop/projects/
├── wiki_masters_bot.py          # Main script
├── requirements.txt              # Python dependencies
├── wiki_masters_bot.log          # Log file (created on first run)
├── wiki_masters_bot.log.1        # Rotated log backup
├── wiki_masters_bot.log.2        # Rotated log backup
├── wiki_masters_bot.log.3        # Rotated log backup
└── error_screenshot.png          # Last error screenshot (if any)
```

## Security Considerations

### Credential Storage
- Credentials stored in plaintext in script (not ideal for production)
- For improved security, consider:
  - Environment variables
  - Encrypted configuration file
  - Secret management service

### Current Approach (Acceptable for Personal Use)
- Script stored locally on user's machine
- File permissions can be restricted (chmod 600 on Linux/Mac)
- Not shared in version control (should add to .gitignore)

### Network Security
- Uses HTTPS for all connections
- No sensitive data logged (password not logged)
- Screenshots may contain session data (stored locally only)

## Future Enhancements (Out of Scope)

While not part of this design, potential future improvements could include:

- Multi-account support
- Configuration file instead of hardcoded constants
- Environment variable support for credentials
- Metrics collection (packs opened, success rate)
- Notification system (email/Slack when packs available)
- Web dashboard for monitoring
- Docker containerization
- Automatic retry logic with exponential backoff
- Health check endpoint
- Card data collection and storage

## Appendix: Element Selectors

### Login Page Elements
- **"se connecter" button**: Text-based selector
- **Email field**: ID or name attribute (to be determined during implementation)
- **Password field**: ID or name attribute (to be determined during implementation)

### Pulls Page Elements
- **Availability message**: Text search for "0 / 10 paquets disponibles"
- **"Ouvrir" button**: Text-based selector
- **Right arrow button**: SVG with `polyline` having `points="9 18 15 12 9 6"`
- **"Continuer" button**: Text-based selector

**Note**: Exact selectors (CSS, XPath) will be determined during implementation based on actual page HTML structure.

## Success Criteria

The implementation will be considered successful when:

1. ✅ Script logs in successfully to wiki-masters.com
2. ✅ Correctly detects pack availability status
3. ✅ Executes complete sequence when packs available (Ouvrir → 4x arrow → continuer)
4. ✅ Waits 11-15 minutes when no packs available
5. ✅ Runs indefinitely without manual intervention
6. ✅ Logs all activities to both console and file
7. ✅ Handles errors gracefully with screenshots
8. ✅ Responds to Ctrl+C for clean shutdown
9. ✅ Operates in headless mode
10. ✅ Includes clear, concise comments for code understanding

---

**Document Status**: Pending user review  
**Next Step**: User review → Implementation planning (writing-plans skill)
