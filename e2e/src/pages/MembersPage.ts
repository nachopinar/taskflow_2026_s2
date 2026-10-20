import { Locator, Page, Response } from '@playwright/test';
import { MemberItem } from '../components/MemberItem';
import { BasePage, exactText } from './BasePage';

export class MembersPage extends BasePage {
  readonly root: Locator;
  readonly addForm: Locator;
  readonly emailInput: Locator;
  readonly addButton: Locator;
  readonly readonlyNote: Locator;
  readonly items: Locator;
  readonly error: Locator;
  private projectId = '';

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('members-page');
    this.addForm = page.getByTestId('member-add-form');
    this.emailInput = page.getByTestId('member-email-input');
    this.addButton = page.getByTestId('member-add-button');
    this.readonlyNote = page.getByTestId('members-readonly-note');
    this.items = page.getByTestId('member-list').getByTestId('member-item');
    this.error = this.root.getByTestId('error-message');
  }

  async goto(projectId: string): Promise<void> {
    this.projectId = projectId;
    await this.page.goto(`/projects/${projectId}/members`);
    await this.root.waitFor();
  }

  async addMember(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.mutate(() => this.addButton.click(), {
      method: 'POST',
      path: `/api/projects/${this.projectId}/members`,
    });
  }

  async removeMember(email: string): Promise<Response> {
    return this.mutate(() => this.member(email).removeButton.click(), {
      method: 'DELETE',
      path: new RegExp(`^/api/projects/${this.projectId}/members/`),
    });
  }

  member(email: string): MemberItem {
    return new MemberItem(
      this.items.filter({
        has: this.page.getByTestId('member-item-email').filter({ hasText: exactText(email) }),
      }),
    );
  }
}
