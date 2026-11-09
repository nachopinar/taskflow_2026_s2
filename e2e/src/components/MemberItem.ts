import { Locator } from '@playwright/test';

export class MemberItem {
  readonly email: Locator;
  readonly role: Locator;
  readonly removeButton: Locator;

  constructor(readonly root: Locator) {
    this.email = root.getByTestId('member-item-email');
    this.role = root.getByTestId('member-item-role');
    this.removeButton = root.getByTestId('member-remove-button');
  }
}
