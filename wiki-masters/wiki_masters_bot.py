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
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

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
ACTION_DELAY_MAX = 5
WAIT_WHEN_NO_PACKS_MIN = 660  # 11 minutes
WAIT_WHEN_NO_PACKS_MAX = 900  # 15 minutes

# Browser configuration
HEADLESS_MODE = False
WINDOW_WIDTH = 1920
WINDOW_HEIGHT = 1080

# Wait timeouts (in seconds)
EXPLICIT_WAIT_TIMEOUT = 10

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

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def random_delay(min_seconds, max_seconds):
    """Sleep for a random duration between min and max seconds."""
    delay = random.uniform(min_seconds, max_seconds)
    logger.debug(f"Waiting {delay:.2f} seconds...")
    time.sleep(delay)

# ============================================================================
# BROWSER MANAGER
# ============================================================================

class BrowserManager:
    """Manages Chrome WebDriver lifecycle and configuration."""

    def __init__(self):
        """Initialize Chrome WebDriver with anti-detection configuration."""
        logger.info("Initializing Chrome WebDriver with anti-detection...")

        # Configure Chrome options for undetected-chromedriver
        chrome_options = uc.ChromeOptions()

        if HEADLESS_MODE:
            chrome_options.add_argument('--headless=new')
            logger.debug("Headless mode enabled")

        # Stability options (compatible with undetected-chromedriver)
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument(f'--window-size={WINDOW_WIDTH},{WINDOW_HEIGHT}')

        # Additional stealth options
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')

        # Initialize WebDriver with undetected-chromedriver
        # This automatically bypasses most bot detection including Cloudflare
        self.driver = uc.Chrome(options=chrome_options, use_subprocess=True)

        logger.info("Chrome WebDriver initialized successfully with anti-detection")

    def get_driver(self):
        """Return the WebDriver instance."""
        return self.driver

    def quit(self):
        """Close browser and clean up resources."""
        if self.driver:
            logger.info("Closing browser...")
            self.driver.quit()
            logger.debug("Browser closed successfully")

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

        # Click "Se connecter" button
        logger.debug("Looking for 'Se connecter' button...")
        wait = WebDriverWait(driver, EXPLICIT_WAIT_TIMEOUT)
        se_connecter_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Se connecter')]"))
        )
        se_connecter_btn.click()
        logger.debug("Clicked 'Se connecter' button")
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

# ============================================================================
# CARD DECK HANDLER
# ============================================================================

class CardDeckHandler:
    """Handles card pack availability checking and opening sequence."""

    def check_verification_popup(self, driver):
        """
        Check if the anti-bot verification popup is present.

        Returns:
            True if verification popup detected
            False if no popup found
        """
        try:
            # Look for the "Vérification rapide" text in the popup
            verification_elements = driver.find_elements(
                By.XPATH,
                "//*[contains(text(), 'Vérification rapide')]"
            )

            if verification_elements:
                logger.warning("=" * 60)
                logger.warning("VERIFICATION POPUP DETECTED!")
                logger.warning("The website is asking for manual verification:")
                logger.warning("'Vérification rapide' - 'Je ne suis pas un robot'")
                logger.warning("Please complete the verification manually")
                logger.warning("=" * 60)

                # Take a screenshot for reference
                try:
                    screenshot_path = f"verification_popup_{int(time.time())}.png"
                    driver.save_screenshot(screenshot_path)
                    logger.info(f"Verification popup screenshot saved to {screenshot_path}")
                except Exception as screenshot_error:
                    logger.warning(f"Could not save verification screenshot: {screenshot_error}")

                return True

            return False

        except Exception as e:
            logger.debug(f"Error checking for verification popup: {e}")
            return False

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

        # PRE-CHECK: Verify packs are still available RIGHT before clicking
        logger.debug("Pre-check: Verifying packs are available immediately before click...")
        try:
            # Find the pack count element using CSS selector (more reliable)
            import re
            pack_count_found = False

            # Try to find text containing pack count
            all_text_elements = driver.find_elements(By.XPATH, "//*[contains(text(), '/')]")
            for elem in all_text_elements:
                text = elem.text.strip()
                # Match pattern like "0 / 10", "8 / 10", etc.
                if '/' in text and '10' in text:
                    logger.debug(f"Pack count element found: '{text}'")
                    pack_count_found = True

                    # Extract the first number
                    match = re.search(r'(\d+)\s*/\s*10', text)
                    if match:
                        count = int(match.group(1))
                        logger.debug(f"Extracted pack count: {count}")

                        if count == 0:
                            logger.warning("NO PACKS AVAILABLE (0/10) - aborting sequence to avoid wasted clicks")
                            raise Exception("No packs available - race condition detected")
                        else:
                            logger.debug(f"Packs available: {count}/10 - proceeding")
                    break

            if not pack_count_found:
                logger.warning("Could not find pack count - proceeding with caution (may fail)")

        except Exception as e:
            if "race condition" in str(e):
                raise  # Re-raise to be caught by outer handler
            logger.warning(f"Pre-check error: {e}, attempting to proceed anyway")

        # Step 1: Try multiple strategies to click the pack
        logger.debug("Looking for pack opening element...")

        # Strategy 1: Try to click the pack image directly (more reliable than button text)
        try:
            logger.debug("Strategy 1: Looking for pack image...")
            pack_image = driver.find_element(By.XPATH, "//img[contains(@src, 'pack') or contains(@alt, 'pack')]")
            logger.debug(f"Found pack image: {pack_image.get_attribute('src')}")
            # Scroll into view and click with JavaScript
            driver.execute_script("arguments[0].scrollIntoView(true);", pack_image)
            random_delay(0.5, 1.0)
            driver.execute_script("arguments[0].click();", pack_image)
            logger.debug("Clicked pack image using JavaScript")
        except NoSuchElementException:
            logger.debug("Strategy 1 failed - pack image not found")

            # Strategy 2: Click the "Ouvrir" button with JavaScript
            logger.debug("Strategy 2: Looking for 'Ouvrir' button...")
            ouvrir_btn = wait.until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Ouvrir')]"))
            )
            logger.debug(f"Found Ouvrir element - tag: {ouvrir_btn.tag_name}, enabled: {ouvrir_btn.is_enabled()}")

            # Click with JavaScript (more reliable than Selenium click)
            driver.execute_script("arguments[0].scrollIntoView(true);", ouvrir_btn)
            random_delay(0.5, 1.0)
            driver.execute_script("arguments[0].click();", ouvrir_btn)
            logger.debug("Clicked 'Ouvrir' button using JavaScript")

        # DIAGNOSTIC: Log page state after click
        logger.debug(f"Page title after Ouvrir click: {driver.title}")
        logger.debug(f"Current URL: {driver.current_url}")

        # Wait for page transition - look for elements that disappear/appear
        logger.debug("Waiting for pack opening animation to complete...")
        try:
            # Wait for the "Ouvrir" button to disappear (indicates transition started)
            WebDriverWait(driver, 5).until(
                EC.invisibility_of_element_located((By.XPATH, "//*[contains(text(), 'Ouvrir')]"))
            )
            logger.debug("Pack opening transition detected")
        except TimeoutException:
            logger.warning("Ouvrir button still visible after 5 seconds - transition may not have started")
            # Take a diagnostic screenshot
            driver.save_screenshot("diagnostic_after_ouvrir.png")
            logger.debug("Diagnostic screenshot saved to diagnostic_after_ouvrir.png")

        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)

        # Step 2: Click right arrow 4 times
        logger.debug("Clicking right arrow 4 times...")
        for i in range(4):
            # DIAGNOSTIC: Check what's on the page before looking for arrow
            if i == 0:
                logger.debug("Looking for first arrow button...")
                # Log visible buttons for debugging
                try:
                    buttons = driver.find_elements(By.TAG_NAME, "button")
                    logger.debug(f"Found {len(buttons)} button elements on page")
                except:
                    logger.debug("Could not enumerate buttons")

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
                    # Packs available - check for verification popup before executing sequence
                    if self.card_handler.check_verification_popup(self.driver):
                        # Popup detected - click check box to navigate away
                        logger.info("Verification popup detected")
                        try:
                            wait = WebDriverWait(self.driver, EXPLICIT_WAIT_TIMEOUT)
                            profil_link = wait.until(
                                EC.element_to_be_clickable((By.XPATH, "/html/body/div[2]/main/div/div[1]/div[1]/label[2]"))
                            )
                            profil_link.click()
                            logger.debug("Clicked Checkbox")
                            random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)

                            # Popup detected - click "continuer" button
                            wait = WebDriverWait(self.driver, EXPLICIT_WAIT_TIMEOUT)
                            profil_link = wait.until(
                                EC.element_to_be_clickable((By.XPATH, "/html/body/div[2]/main/div/div[1]/div[1]/button"))
                            )
                            profil_link.click()
                            logger.debug("Clicked 'continuer' button")
                            random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)

                            # Navigate back to pulls page
                            logger.info("Returning to pulls page...")
                            self.driver.get(PULLS_URL)
                            random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
                            continue  # Skip this iteration and check again
                        except Exception as profil_error:
                            logger.warning(f"Could not execute command: {profil_error}")
                            # If clicking check box fails, wait and try again
                            time.sleep(30)
                            self.driver.get(PULLS_URL)
                            random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
                            continue

                    # No popup - execute sequence normally
                    try:
                        self.card_handler.execute_card_sequence(self.driver)
                        logger.info("Sequence completed - returning to pulls page...")
                        self.driver.get(PULLS_URL)
                        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
                        logger.info("Ready to check again...")
                    except TimeoutException as timeout_error:
                        # Timeout during sequence - likely animation didn't start or element missing
                        logger.warning(f"Timeout during card sequence: {timeout_error}")
                        logger.info("Pack opening may have failed - returning to pulls page to re-check...")
                        self.driver.save_screenshot("timeout_error.png")
                        logger.debug("Timeout screenshot saved to timeout_error.png")
                        self.driver.get(PULLS_URL)
                        random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
                    except Exception as seq_error:
                        # Handle race condition or other errors during sequence
                        error_msg = str(seq_error)
                        if "race condition" in error_msg or "No packs available" in error_msg:
                            logger.warning(f"Pack availability changed during sequence: {error_msg}")
                            logger.info("Returning to pulls page to re-check availability...")
                            self.driver.get(PULLS_URL)
                            random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
                        elif "disabled" in error_msg:
                            logger.warning(f"Button interaction failed: {error_msg}")
                            logger.info("Returning to pulls page to re-check...")
                            self.driver.get(PULLS_URL)
                            random_delay(ACTION_DELAY_MIN, ACTION_DELAY_MAX)
                        else:
                            # Unknown error - re-raise to trigger shutdown
                            raise

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

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    bot = WikiMastersBot()
    bot.run()
