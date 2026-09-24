# Wiki Masters Automation Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python Selenium automation script that logs into wiki-masters.com and continuously opens card packs when available, waiting intelligently when packs are unavailable.

**Architecture:** Modular class-based design with BrowserManager (WebDriver lifecycle), LoginHandler (authentication), CardDeckHandler (pack interactions), and WikiMastersBot (orchestrator). Single-file implementation with comprehensive logging to both console and rotating file handler.

**Tech Stack:** Python 3.7+, Selenium 4.0+, webdriver-manager 3.8+, Chrome WebDriver (headless mode)

**Spec:** `docs/superpowers/specs/2026-09-24-wiki-masters-automation-design.md`

## Global Constraints

- Python 3.7 or higher required
- Selenium >= 4.0.0
- webdriver-manager >= 3.8.0
- Chrome/Chromium browser must be installed
- Headless mode enabled by default
- All timing uses random delays: 2-7s between actions, 11-15 min when no packs available
- Log format: `[YYYY-MM-DD HH:MM:SS] LEVEL: Message`
- Rotating log handler: max 5MB, 3 backup files
- Error screenshots saved as `error_screenshot.png`
- Clear, concise comments required for code understanding

---

### Task 1: Project Dependencies

**Files:**
- Create: `requirements.txt`

**Interfaces:**
- Consumes: None
- Produces: Dependency specification for pip install

- [ ] **Step 1: Create requirements.txt file**

Create the file with exact version requirements:

```
selenium>=4.0.0
webdriver-manager>=3.8.0
```

- [ ] **Step 2: Verify file contents**

Run: `cat requirements.txt`
Expected: File contains both dependencies with correct version specifiers

- [ ] **Step 3: Test dependency installation**

Run: `pip install -r requirements.txt`
Expected: Both packages install successfully without errors

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "chore: add project dependencies for Selenium automation"
```

---

### Task 2: Configuration Constants and Logging Setup

**Files:**
- Create: `wiki_masters_bot.py` (initial setup with imports, constants, and logging)

**Interfaces:**
- Consumes: None
- Produces:
  - Constants: `EMAIL`, `PASSWORD`, `SIGNUP_URL`, `PULLS_URL`, `ACTION_DELAY_MIN`, `ACTION_DELAY_MAX`, `WAIT_WHEN_NO_PACKS_MIN`, `WAIT_WHEN_NO_PACKS_MAX`, `HEADLESS_MODE`, `WINDOW_WIDTH`, `WINDOW_HEIGHT`, `EXPLICIT_WAIT_TIMEOUT`
  - Logger: `logger` (configured with console and rotating file handlers)
  - Helper function: `random_delay(min_seconds: int, max_seconds: int) -> None`

- [ ] **Step 1: Create initial file with imports**

```python
#!/usr/bin/env python3
"""
Wiki Masters Automation Bot

Automates card pack opening on wiki-masters.com.
Logs in, checks for available packs, opens them when available,
and waits when unavailable. Runs indefinitely until manually stopped.
"""

import logging
import random
import time
import sys
from logging.handlers import RotatingFileHandler
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
```

- [ ] **Step 2: Add configuration constants**

```python
# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

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

# Browser configuration
HEADLESS_MODE = True
WINDOW_WIDTH = 1920
WINDOW_HEIGHT = 1080

# Wait timeouts (in seconds)
EXPLICIT_WAIT_TIMEOUT = 10
```

- [ ] **Step 3: Add logging setup**

```python
# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging():
    """Configure logging with console and rotating file handlers."""
    logger = logging.getLogger('WikiMastersBot')
    logger.setLevel(logging.DEBUG)
    
    # Console handler (INFO level)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s', 
                                       datefmt='%Y-%m-%d %H:%M:%S')
    console_handler.setFormatter(console_format)
    
    # File handler (DEBUG level, rotating)
    file_handler = RotatingFileHandler(
        'wiki_masters_bot.log',
        maxBytes=5 * 1024 * 1024,  # 5 MB
        backupCount=3
    )
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s',
                                    datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(file_format)
    
    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger

# Initialize logger
logger = setup_logging()
```

- [ ] **Step 4: Add random delay helper function**

```python
# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def random_delay(min_seconds, max_seconds):
    """Sleep for a random duration between min and max seconds."""
    delay = random.uniform(min_seconds, max_seconds)
    logger.debug(f"Waiting {delay:.2f} seconds...")
    time.sleep(delay)
```

- [ ] **Step 5: Verify imports and constants**

Run: `python -c "import wiki_masters_bot; print('Imports successful')"`
Expected: No import errors, "Imports successful" printed

- [ ] **Step 6: Commit**

```bash
git add wiki_masters_bot.py
git commit -m "feat: add configuration constants and logging setup"
```

---

### Task 3: BrowserManager Class

**Files:**
- Modify: `wiki_masters_bot.py` (add BrowserManager class)

**Interfaces:**
- Consumes: `HEADLESS_MODE`, `WINDOW_WIDTH`, `WINDOW_HEIGHT` (from Task 2)
- Produces:
  - Class: `BrowserManager`
  - Method: `__init__(self) -> None` - Creates and configures Chrome WebDriver
  - Method: `get_driver(self) -> webdriver.Chrome` - Returns WebDriver instance
  - Method: `quit(self) -> None` - Closes browser and cleans up

- [ ] **Step 1: Add BrowserManager class**

Add after the helper functions section:

```python
# ============================================================================
# BROWSER MANAGER
# ============================================================================

class BrowserManager:
    """Manages Chrome WebDriver lifecycle and configuration."""
    
    def __init__(self):
        """Initialize Chrome WebDriver with headless configuration."""
        logger.info("Initializing Chrome WebDriver...")
        
        # Configure Chrome options
        chrome_options = webdriver.ChromeOptions()
        
        if HEADLESS_MODE:
            chrome_options.add_argument('--headless')
            logger.debug("Headless mode enabled")
        
        # Stability and compatibility options
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument(f'--window-size={WINDOW_WIDTH},{WINDOW_HEIGHT}')
        
        # Initialize WebDriver with auto-managed ChromeDriver
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        
        logger.info("Chrome WebDriver initialized successfully")
    
    def get_driver(self):
        """Return the WebDriver instance."""
        return self.driver
    
    def quit(self):
        """Close browser and clean up resources."""
        if self.driver:
            logger.info("Closing browser...")
            self.driver.quit()
            logger.debug("Browser closed successfully")
```

- [ ] **Step 2: Add manual test code**

Add at the bottom of the file:

```python
# Manual test for BrowserManager
if __name__ == "__main__":
    logger.info("Testing BrowserManager...")
    try:
        browser_mgr = BrowserManager()
        driver = browser_mgr.get_driver()
        driver.get("https://www.google.com")
        logger.info(f"Page title: {driver.title}")
        time.sleep(2)
        browser_mgr.quit()
        logger.info("BrowserManager test passed")
    except Exception as e:
        logger.error(f"BrowserManager test failed: {e}")
        sys.exit(1)
```

- [ ] **Step 3: Run manual test**

Run: `python wiki_masters_bot.py`
Expected: Browser opens (or runs headless), navigates to Google, prints title, closes successfully

- [ ] **Step 4: Remove manual test code**

Delete the test code added in Step 2 (keep the `if __name__ == "__main__":` block empty for now)

- [ ] **Step 5: Commit**

```bash
git add wiki_masters_bot.py
git commit -m "feat: add BrowserManager class for WebDriver lifecycle"
```

---

### Task 4: LoginHandler Class

**Files:**
- Modify: `wiki_masters_bot.py` (add LoginHandler class)

**Interfaces:**
- Consumes:
  - `EMAIL`, `PASSWORD`, `SIGNUP_URL`, `PULLS_URL`, `ACTION_DELAY_MIN`, `ACTION_DELAY_MAX`, `EXPLICIT_WAIT_TIMEOUT` (from Task 2)
  - `random_delay(min_seconds, max_seconds)` (from Task 2)
  - `webdriver.Chrome` instance (from BrowserManager)
- Produces:
  - Class: `LoginHandler`
  - Method: `login(self, driver: webdriver.Chrome) -> None` - Executes login flow and verifies success

- [ ] **Step 1: Add LoginHandler class**

Add after BrowserManager class:

```python
# ============================================================================
# LOGIN HANDLER
# ============================================================================

class LoginHandler:
    """Handles authentication flow for wiki-masters.com."""
    
    def login(self, driver):
        """
        Execute the login flow.
        
        Steps:
        1. Navigate to signup page
        2. Click "se connecter" button
        3. Enter email and password
        4. Submit form
        5. Verify navigation to /pulls page
        """
        logger.info("Starting login process...")
        
        # Navigate to signup page
        logger.debug(f"Navigating to {SIGNUP_URL}")
        driver.get(SIGNUP_URL)
        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
        
        # Click "se connecter" button
        logger.debug("Looking for 'se connecter' button...")
        wait = WebDriverWait(driver, EXPLICIT_WAIT_TIMEOUT)
        se_connecter_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'se connecter')]"))
        )
        se_connecter_btn.click()
        logger.debug("Clicked 'se connecter' button")
        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
        
        # Enter email
        logger.debug("Entering email...")
        email_field = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[name*='email' i], input[id*='email' i]"))
        )
        email_field.clear()
        email_field.send_keys(EMAIL)
        logger.debug("Email entered")
        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
        
        # Enter password
        logger.debug("Entering password...")
        password_field = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
        )
        password_field.clear()
        password_field.send_keys(PASSWORD)
        logger.debug("Password entered")
        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
        
        # Submit form
        logger.debug("Submitting login form...")
        password_field.submit()
        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
        
        # Verify we reached the pulls page
        logger.debug("Verifying login success...")
        wait.until(EC.url_contains("/pulls"))
        
        current_url = driver.current_url
        if "/pulls" in current_url:
            logger.info("Login successful - reached pulls page")
        else:
            raise Exception(f"Login failed - unexpected URL: {current_url}")
```

- [ ] **Step 2: Add manual test code**

Add at the bottom of the file:

```python
# Manual test for LoginHandler
if __name__ == "__main__":
    logger.info("Testing LoginHandler...")
    browser_mgr = None
    try:
        browser_mgr = BrowserManager()
        driver = browser_mgr.get_driver()
        
        login_handler = LoginHandler()
        login_handler.login(driver)
        
        logger.info("LoginHandler test passed - waiting 5 seconds to verify...")
        time.sleep(5)
        
        browser_mgr.quit()
        logger.info("Test completed successfully")
    except Exception as e:
        logger.error(f"LoginHandler test failed: {e}", exc_info=True)
        if browser_mgr:
            browser_mgr.quit()
        sys.exit(1)
```

- [ ] **Step 3: Run manual test**

Run: `python wiki_masters_bot.py`
Expected: Browser navigates through login flow, reaches /pulls page, test passes

- [ ] **Step 4: Remove manual test code**

Delete the test code added in Step 2

- [ ] **Step 5: Commit**

```bash
git add wiki_masters_bot.py
git commit -m "feat: add LoginHandler class for authentication"
```

---

### Task 5: CardDeckHandler Class

**Files:**
- Modify: `wiki_masters_bot.py` (add CardDeckHandler class)

**Interfaces:**
- Consumes:
  - `ACTION_DELAY_MIN`, `ACTION_DELAY_MAX`, `EXPLICIT_WAIT_TIMEOUT` (from Task 2)
  - `random_delay(min_seconds, max_seconds)` (from Task 2)
  - `webdriver.Chrome` instance (from BrowserManager)
- Produces:
  - Class: `CardDeckHandler`
  - Method: `check_availability(self, driver: webdriver.Chrome) -> bool` - Returns True if packs unavailable
  - Method: `execute_card_sequence(self, driver: webdriver.Chrome) -> None` - Executes card opening sequence

- [ ] **Step 1: Add CardDeckHandler class**

Add after LoginHandler class:

```python
# ============================================================================
# CARD DECK HANDLER
# ============================================================================

class CardDeckHandler:
    """Handles card pack availability checking and opening sequence."""
    
    def check_availability(self, driver):
        """
        Check if card packs are available.
        
        Returns:
            True if packs are NOT available (message "0 / 10 paquets disponibles" found)
            False if packs ARE available (message not found)
        """
        logger.debug("Checking pack availability...")
        
        try:
            # Look for the "0 / 10 paquets disponibles" message
            elements = driver.find_elements(
                By.XPATH, 
                "//*[contains(text(), '0 / 10') and contains(text(), 'paquets disponibles')]"
            )
            
            if elements:
                logger.info("No packs available (0 / 10 paquets disponibles)")
                return True  # Packs NOT available
            else:
                logger.info("Packs available - ready to open")
                return False  # Packs ARE available
                
        except Exception as e:
            logger.warning(f"Error checking availability: {e}")
            # Assume packs are available if we can't determine
            return False
    
    def execute_card_sequence(self, driver):
        """
        Execute the card opening sequence.
        
        Steps:
        1. Click "Ouvrir" button
        2. Click right arrow button 4 times
        3. Click "continuer" button
        """
        logger.info("Starting card opening sequence...")
        wait = WebDriverWait(driver, EXPLICIT_WAIT_TIMEOUT)
        
        # Step 1: Click "Ouvrir" button
        logger.debug("Looking for 'Ouvrir' button...")
        ouvrir_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Ouvrir')]"))
        )
        ouvrir_btn.click()
        logger.debug("Clicked 'Ouvrir' button")
        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
        
        # Step 2: Click right arrow 4 times
        logger.debug("Clicking right arrow 4 times...")
        for i in range(4):
            # Find arrow button by SVG polyline points
            arrow_btn = wait.until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    "//button[.//svg//polyline[@points='9 18 15 12 9 6']]"
                ))
            )
            arrow_btn.click()
            logger.debug(f"Clicked right arrow {i + 1}/4")
            random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
        
        # Step 3: Click "continuer" button
        logger.debug("Looking for 'continuer' button...")
        continuer_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'continuer')]"))
        )
        continuer_btn.click()
        logger.debug("Clicked 'continuer' button")
        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
        
        logger.info("Card opening sequence completed successfully")
```

- [ ] **Step 2: Add manual test code**

Add at the bottom of the file:

```python
# Manual test for CardDeckHandler
if __name__ == "__main__":
    logger.info("Testing CardDeckHandler...")
    browser_mgr = None
    try:
        # Set headless to False for visual testing
        original_headless = globals()['HEADLESS_MODE']
        globals()['HEADLESS_MODE'] = False
        
        browser_mgr = BrowserManager()
        driver = browser_mgr.get_driver()
        
        # Login first
        login_handler = LoginHandler()
        login_handler.login(driver)
        
        # Test card deck handler
        card_handler = CardDeckHandler()
        
        # Check availability
        no_packs = card_handler.check_availability(driver)
        logger.info(f"Pack availability check: {'No packs' if no_packs else 'Packs available'}")
        
        # Only try to execute sequence if packs are available
        if not no_packs:
            logger.info("Attempting to execute card sequence...")
            card_handler.execute_card_sequence(driver)
            logger.info("CardDeckHandler test passed")
        else:
            logger.info("Skipping sequence execution - no packs available")
        
        time.sleep(5)
        browser_mgr.quit()
        
        # Restore original setting
        globals()['HEADLESS_MODE'] = original_headless
        
    except Exception as e:
        logger.error(f"CardDeckHandler test failed: {e}", exc_info=True)
        if browser_mgr:
            browser_mgr.quit()
        sys.exit(1)
```

- [ ] **Step 3: Run manual test**

Run: `python wiki_masters_bot.py`
Expected: Browser logs in, checks availability, executes sequence if packs available, test passes

- [ ] **Step 4: Remove manual test code**

Delete the test code added in Step 2

- [ ] **Step 5: Commit**

```bash
git add wiki_masters_bot.py
git commit -m "feat: add CardDeckHandler for pack checking and opening"
```

---

### Task 6: WikiMastersBot Orchestrator

**Files:**
- Modify: `wiki_masters_bot.py` (add WikiMastersBot class)

**Interfaces:**
- Consumes:
  - `WAIT_WHEN_NO_PACKS_MIN`, `WAIT_WHEN_NO_PACKS_MAX` (from Task 2)
  - `random_delay(min_seconds, max_seconds)` (from Task 2)
  - `BrowserManager` (from Task 3)
  - `LoginHandler` (from Task 4)
  - `CardDeckHandler` (from Task 5)
- Produces:
  - Class: `WikiMastersBot`
  - Method: `__init__(self) -> None` - Initialize all components
  - Method: `run(self) -> None` - Main execution loop
  - Method: `shutdown(self, error: Exception = None) -> None` - Cleanup and exit

- [ ] **Step 1: Add WikiMastersBot class**

Add after CardDeckHandler class:

```python
# ============================================================================
# WIKI MASTERS BOT - MAIN ORCHESTRATOR
# ============================================================================

class WikiMastersBot:
    """Main orchestrator for the Wiki Masters automation bot."""
    
    def __init__(self):
        """Initialize all components."""
        logger.info("=" * 60)
        logger.info("Wiki Masters Automation Bot Starting...")
        logger.info("=" * 60)
        
        self.browser_manager = None
        self.driver = None
        self.login_handler = LoginHandler()
        self.card_handler = CardDeckHandler()
    
    def run(self):
        """
        Main execution loop.
        
        Flow:
        1. Initialize browser and login
        2. Loop forever:
           a. Check pack availability
           b. If available: execute sequence, loop immediately
           c. If not available: wait 11-15 minutes, loop
        """
        try:
            # Initialize browser
            self.browser_manager = BrowserManager()
            self.driver = self.browser_manager.get_driver()
            
            # Login once at startup
            self.login_handler.login(self.driver)
            
            logger.info("Entering main automation loop...")
            logger.info("Press Ctrl+C to stop the bot")
            
            # Main infinite loop
            while True:
                # Check if packs are available
                packs_unavailable = self.card_handler.check_availability(self.driver)
                
                if packs_unavailable:
                    # No packs - wait 11-15 minutes
                    wait_minutes = random.uniform(
                        WAIT_WHEN_NO_PACKS_MIN / 60,
                        WAIT_WHEN_NO_PACKS_MAX / 60
                    )
                    logger.info(f"No packs available - waiting {wait_minutes:.2f} minutes...")
                    time.sleep(wait_minutes * 60)
                    logger.info("Wait completed - checking again...")
                else:
                    # Packs available - execute sequence
                    self.card_handler.execute_card_sequence(self.driver)
                    logger.info("Sequence completed - checking again immediately...")
                    
        except KeyboardInterrupt:
            # User pressed Ctrl+C - graceful shutdown
            logger.info("Keyboard interrupt received (Ctrl+C)")
            self.shutdown()
            
        except Exception as e:
            # Unexpected error - log and shutdown
            logger.error("Unexpected error occurred", exc_info=True)
            self.shutdown(error=e)
    
    def shutdown(self, error=None):
        """
        Clean up resources and exit.
        
        Args:
            error: Exception object if shutdown due to error, None for clean shutdown
        """
        logger.info("Initiating shutdown...")
        
        # Take screenshot if there was an error
        if error and self.driver:
            try:
                screenshot_path = "error_screenshot.png"
                self.driver.save_screenshot(screenshot_path)
                logger.info(f"Error screenshot saved to {screenshot_path}")
            except Exception as screenshot_error:
                logger.warning(f"Could not save screenshot: {screenshot_error}")
        
        # Close browser
        if self.browser_manager:
            self.browser_manager.quit()
        
        logger.info("=" * 60)
        if error:
            logger.error("Bot stopped due to error")
            logger.info("=" * 60)
            sys.exit(1)
        else:
            logger.info("Bot stopped successfully")
            logger.info("=" * 60)
            sys.exit(0)
```

- [ ] **Step 2: Add main entry point**

Add at the bottom of the file:

```python
# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    bot = WikiMastersBot()
    bot.run()
```

- [ ] **Step 3: Verify complete script**

Run: `python -m py_compile wiki_masters_bot.py`
Expected: No syntax errors

- [ ] **Step 4: Commit**

```bash
git add wiki_masters_bot.py
git commit -m "feat: add WikiMastersBot orchestrator and main entry point"
```

---

### Task 7: Manual Testing and Documentation

**Files:**
- Modify: `wiki_masters_bot.py` (adjust HEADLESS_MODE for testing)
- Create: `README.md` (usage documentation)

**Interfaces:**
- Consumes: Complete `wiki_masters_bot.py` from all previous tasks
- Produces: Tested, documented automation script ready for production use

- [ ] **Step 1: Test in visible mode**

Modify `wiki_masters_bot.py`:
- Change `HEADLESS_MODE = True` to `HEADLESS_MODE = False`

Run: `python wiki_masters_bot.py`
Expected: Browser opens visibly, logs in, checks packs, executes sequence or waits

- [ ] **Step 2: Verify login flow**

Observe the visible browser execution:
- Navigation to signup page
- Click on "se connecter"
- Credentials entered
- Navigation to /pulls page
- Log output confirms success

- [ ] **Step 3: Verify availability check and sequence**

Continue observing:
- Check for "0 / 10 paquets disponibles" message detection
- If packs available: "Ouvrir" clicked → arrow clicked 4x → "continuer" clicked
- If unavailable: Wait message logged
- Console logs match observed actions

- [ ] **Step 4: Test Ctrl+C shutdown**

Press Ctrl+C while script is running
Expected: Clean shutdown logged, browser closes, no errors

- [ ] **Step 5: Restore headless mode**

Modify `wiki_masters_bot.py`:
- Change `HEADLESS_MODE = False` back to `HEADLESS_MODE = True`

- [ ] **Step 6: Test error handling with wrong credentials**

Temporarily modify credentials in `wiki_masters_bot.py`:
- Change `PASSWORD` to `"wrong_password"`

Run: `python wiki_masters_bot.py`
Expected: Login fails, error logged, screenshot saved, script exits

Restore correct password:
- Change `PASSWORD` back to `"oN2eQB36!"`

- [ ] **Step 7: Verify log file creation**

Run: `python wiki_masters_bot.py` (let it run for 30 seconds, then Ctrl+C)

Check log file:
```bash
ls -lh wiki_masters_bot.log
cat wiki_masters_bot.log
```
Expected: Log file exists, contains timestamped entries with proper formatting

- [ ] **Step 8: Create README documentation**

```markdown
# Wiki Masters Automation Bot

Automates card pack opening on wiki-masters.com. The bot logs in, continuously checks for available card packs, opens them when available, and waits intelligently when packs are unavailable.

## Requirements

- Python 3.7 or higher
- Chrome/Chromium browser installed
- Internet connection

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Configuration

Edit the constants at the top of `wiki_masters_bot.py`:

- **Credentials**: `EMAIL` and `PASSWORD`
- **Timing**: Adjust `ACTION_DELAY_MIN/MAX` and `WAIT_WHEN_NO_PACKS_MIN/MAX`
- **Headless Mode**: Set `HEADLESS_MODE = False` to see browser (useful for debugging)

## Usage

Run the bot:
```bash
python wiki_masters_bot.py
```

Stop the bot:
- Press `Ctrl+C`

## Monitoring

Watch logs in real-time:
```bash
tail -f wiki_masters_bot.log
```

## Background Execution (Linux/Mac)

Using nohup:
```bash
nohup python wiki_masters_bot.py &
```

Using screen:
```bash
screen -S wiki_bot
python wiki_masters_bot.py
# Detach with Ctrl+A, then D
```

## Files

- `wiki_masters_bot.py` - Main script
- `requirements.txt` - Python dependencies
- `wiki_masters_bot.log` - Log file (auto-created, rotates at 5MB)
- `error_screenshot.png` - Screenshot saved when errors occur

## Troubleshooting

**Login fails**: Verify credentials in script are correct

**Elements not found**: Website structure may have changed, update selectors in code

**ChromeDriver issues**: Delete cached driver and restart (webdriver-manager will re-download)

## Security Note

Credentials are stored in plaintext. For production use, consider environment variables or encrypted configuration.
```

- [ ] **Step 9: Final commit**

```bash
git add wiki_masters_bot.py README.md
git commit -m "docs: add README and complete manual testing

- Tested login flow successfully
- Verified pack availability detection
- Confirmed sequence execution (Ouvrir → 4x arrow → continuer)
- Tested graceful shutdown with Ctrl+C
- Verified error handling and screenshot capture
- Confirmed log file creation and rotation setup
- Script ready for production use

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Plan Self-Review

**Spec Coverage Check:**
✅ Login automation (Task 4)
✅ Pack availability checking (Task 5)
✅ Card opening sequence execution (Task 5)
✅ Intelligent waiting (Task 6)
✅ Infinite loop operation (Task 6)
✅ Comprehensive logging (Task 2)
✅ Error handling with screenshots (Task 6)
✅ Graceful shutdown on Ctrl+C (Task 6)
✅ Headless mode operation (Task 3)
✅ Clear code comments (all tasks)

**Placeholder Scan:**
✅ No TBDs, TODOs, or "implement later" placeholders
✅ All code blocks contain actual implementation
✅ All selectors defined (XPath for text-based, CSS for input types)
✅ All error handling specified with actual exception types

**Type Consistency:**
✅ `driver` parameter consistently typed as `webdriver.Chrome`
✅ Return types documented in Interfaces sections
✅ Method names consistent across tasks
✅ Constants referenced by exact names from Task 2

**Dependencies:**
✅ Task 1 produces requirements.txt (no dependencies)
✅ Task 2 produces constants and logger (depends on Task 1 completion)
✅ Task 3 uses constants from Task 2
✅ Task 4 uses constants, logger, and random_delay from Task 2
✅ Task 5 uses constants, logger, and random_delay from Task 2
✅ Task 6 uses all classes from Tasks 3-5
✅ Task 7 uses complete script from Tasks 1-6

All spec requirements covered, no placeholders, types consistent, dependencies clear.
