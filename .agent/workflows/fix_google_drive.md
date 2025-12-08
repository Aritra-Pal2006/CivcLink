---
description: How to enable Google Drive Uploads
---

# How to Enable Google Drive Uploads

To make the Google Drive upload feature work, you need to perform the following steps manually in your terminal and Google Cloud Console.

## 1. Enable Google Drive API

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project (`civiclink-61370`).
3.  Navigate to **APIs & Services** > **Library**.
4.  Search for **"Google Drive API"**.
5.  Click **Enable**.

## 2. Authenticate Firebase CLI

You need to be logged in to deploy the Cloud Functions.

```powershell
firebase login
```
Follow the browser prompts to log in.

## 3. Deploy Cloud Functions

Deploy the updated functions (which contain the `uploadAttachment` logic).

```powershell
firebase deploy --only functions --project civiclink-61370
```

## 4. Verify Service Account (Optional but Recommended)

Ensure your `functions/service-account.json` has the correct permissions.
1.  In Google Cloud Console, go to **IAM & Admin** > **IAM**.
2.  Find the service account email (found in your `service-account.json` file).
3.  Ensure it has the **Editor** or **Drive File Editor** role.

## 5. Test

1.  Reload your application.
2.  Create a new complaint.
3.  Upload a file.
4.  The "Mock" fallback warning should NOT appear in the console if successful.
