---
description: "Request a fresh capture and summarize the result"
---

# @vg-capture

Request a fresh capture of the specified URL (or current page if no URL given).

1. Call `request_capture` with the URL and purpose "capture"
2. Poll `get_request_status` every 2 seconds until completed or declined
3. Once completed, call `get_page_summary` on the new capture
4. Report: page title, total elements, salience distribution, key interactive elements
5. If there are console errors or failed network requests in the capture, flag them
