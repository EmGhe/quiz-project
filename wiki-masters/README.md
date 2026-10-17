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
