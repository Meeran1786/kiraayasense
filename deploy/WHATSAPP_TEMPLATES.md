# WhatsApp templates to submit to Meta

KiraayaSense sends WhatsApp messages through Meta's WhatsApp Business Cloud API.
Messages that we start (every alert) must use a template that Meta has
approved. Create each one below in **WhatsApp Manager → Message templates →
Create template**, with the exact **name**, **category** and **language
English (en)**. The `{{1}}`, `{{2}}` … slots must stay in the same order,
because the code fills them in that order. The wording around them can change.

Until a template is approved, that alert is still saved to the in-site bell
and sent by email. Only the WhatsApp copy is skipped.

| Name | Category | Used for |
|---|---|---|
| `ks_verify_code` | Authentication | The 6-digit code to verify a number |
| `ks_admin_alert` | Utility | Instant admin alerts |
| `ks_admin_daily` | Utility | 9 AM admin summary |
| `ks_owner_new_review` | Utility | Owner: a new review is live |
| `ks_review_live` | Utility | Reviewer: review approved |
| `ks_review_not_approved` | Utility | Reviewer: review rejected |
| `ks_helpful_digest` | Utility | Reviewer: daily helpful votes |
| `ks_points_credited` | Utility | Reviewer: points became available |
| `ks_claim_decided` | Utility | Owner: claim approved or rejected |

## ks_verify_code (Authentication)

Pick **Copy code** as the button type. Meta writes the body text itself:
"*{{1}}* is your verification code." Tick "Add security recommendation" and set
the expiry to 10 minutes.

## ks_admin_alert

> KiraayaSense admin alert: {{1}}
>
> Open: {{2}}

1. what happened, for example "New review of Sunrise PG, Madhapur by Asha, 4.5 stars"
2. link to the admin page

## ks_admin_daily

> Good morning. KiraayaSense today:
> Waiting for you: {{1}} reviews, {{2}} reports, {{3}} claims, {{4}} owner replies.
> Last 24 hours: {{5}} new reviews, {{6}} businesses added by users.
>
> Open the admin: {{7}}

## ks_owner_new_review

> A new {{1}}-star review of {{2}} is live on KiraayaSense. Read it and reply: {{3}}

1. average stars, for example "4.5" (or "new" when there are no star questions)
2. business name
3. link to the owner dashboard

## ks_review_live

> Your review of {{1}} is now live on KiraayaSense. Thank you for helping others decide. See it here: {{2}}

## ks_review_not_approved

> Your review of {{1}} couldn't be published. Reason: {{2}}. You can edit it and send it again: {{3}}

## ks_helpful_digest

> {{1}} people found your KiraayaSense reviews helpful today. See your reviews: {{2}}

## ks_points_credited

> {{1}} KiraayaSense points are now available in your rewards. See them here: {{2}}

## ks_claim_decided

> Your claim to manage {{1}} on KiraayaSense was {{2}}. Details: {{3}}

---

Meta usually approves utility templates within minutes to a day. A template
that reads like marketing gets moved to the Marketing category, which costs
more. Keep the text plain and factual.
