# 8. Testing Strategy

## 8.1 Component Testing

```typescript
// Example test for AssessmentForm
describe('AssessmentForm', () => {
  it('saves draft to IndexedDB on interval', async () => {
    const { getByLabelText } = render(
      <HealthAssessmentForm entityId="test-entity" />
    );
    
    // Fill form
    fireEvent.change(getByLabelText('Functional Clinic'), {
      target: { checked: true }
    });
    
    // Wait for auto-save
    await waitFor(() => {
      const draft = db.drafts.get('health-test-entity');
      expect(draft).toBeDefined();
    }, { timeout: 31000 });
  });
  
  it('queues submission when offline', async () => {
    mockOfflineStatus(true);
    
    const { getByText } = render(
      <HealthAssessmentForm entityId="test-entity" />
    );
    
    fireEvent.click(getByText('Save Offline'));
    
    await waitFor(() => {
      const queueItems = db.syncQueue.toArray();
      expect(queueItems).toHaveLength(1);
    });
  });
});
```

## 8.2 E2E Testing Scenarios

```typescript
// Critical user journeys to test
describe('Offline Assessment Flow', () => {
  test('Complete assessment creation while offline', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    // Navigate to assessment form
    await page.goto('/assessor/assessments/new');
    
    // Fill and submit form
    await page.fill('[name="hasFunctionalClinic"]', 'false');
    await page.click('button[type="submit"]');
    
    // Verify queued
    await expect(page.locator('.sync-queue-badge')).toContainText('1');
    
    // Go online and verify sync
    await page.context().setOffline(false);
    await page.waitForSelector('.sync-success-toast');
  });
});
```
