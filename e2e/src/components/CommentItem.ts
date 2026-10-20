import { Locator } from '@playwright/test';

export class CommentItem {
  readonly body: Locator;
  readonly author: Locator;
  readonly deleteButton: Locator;

  constructor(readonly root: Locator) {
    this.body = root.getByTestId('comment-item-body');
    this.author = root.getByTestId('comment-item-author');
    this.deleteButton = root.getByTestId('comment-delete-button');
  }
}
