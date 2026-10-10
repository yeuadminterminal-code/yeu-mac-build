# ユー Mac app builder

This private repository only builds the ユー Mac app. The app code is a copy of `D:\Coding\yu\desktop`
(refresh it with `.\setup\deploy.ps1 -MacKit`). The secret key is **not** in here: it is the
`YU_APP_SECRET` repository secret.

Build: **Actions → Build Mac app → Run workflow**, wait ~10 minutes, download **Yeu-Mac** under Artifacts.
Upload to the site: `.\setup\deploy.ps1 -MacApp <path to the .dmg>`.
