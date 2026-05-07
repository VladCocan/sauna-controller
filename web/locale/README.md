# Locale Directory

This directory is reserved for Django translation files.

Expected structure:

- `ro/LC_MESSAGES/django.po`
- `en/LC_MESSAGES/django.po`

After adding or updating `.po` files, compile translations with `django-admin compilemessages` in an environment that has GNU gettext (`msgfmt`) installed.
