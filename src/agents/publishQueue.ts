import fs from "fs";
import path from "path";
import {
  PublishQueueItem,
  PublishQueueOutput,
  SeoOptimizedArticle,
} from "./types";

/**
 * 5. PUBLISH QUEUE
 * 
 * 단일 책임 (Single Responsibility):
 * - SEO EDITOR가 완성한 결과물을 수신하여 발행 대기 큐(PENDING 상태)에 안전하게 적재
 * - [중요] 아직 실제 웹사이트 자동 발행은 연결하지 않음 (대기 큐 적재 및 관리 인터페이스만 제공)
 */
export class PublishQueue {
  private queueFilePath: string;

  constructor(customQueuePath?: string) {
    this.queueFilePath =
      customQueuePath ||
      path.join(process.cwd(), "data", "publish-queue.json");
    this.ensureQueueStore();
  }

  private ensureQueueStore(): void {
    const dir = path.dirname(this.queueFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.queueFilePath)) {
      fs.writeFileSync(this.queueFilePath, JSON.stringify([], null, 2), "utf-8");
    }
  }

  /**
   * 큐에 있는 모든 아이템 조회
   */
  public getItems(): PublishQueueItem[] {
    try {
      this.ensureQueueStore();
      const content = fs.readFileSync(this.queueFilePath, "utf-8");
      return JSON.parse(content) as PublishQueueItem[];
    } catch {
      return [];
    }
  }

  /**
   * SEO Editor에서 완성된 기사를 발행 대기 큐에 적재 (PENDING)
   */
  public enqueue(article: SeoOptimizedArticle): PublishQueueOutput {
    const items = this.getItems();

    const queueId = `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newItem: PublishQueueItem = {
      id: queueId,
      status: "PENDING",
      queuedAt: new Date().toISOString(),
      payload: article,
      searchIntent: "INFORMATIONAL",
      attempts: 0,
    };

    items.push(newItem);

    fs.writeFileSync(this.queueFilePath, JSON.stringify(items, null, 2), "utf-8");

    return {
      queueId,
      status: "QUEUED",
      item: newItem,
      queueLength: items.length,
    };
  }

  /**
   * 특정 ID의 큐 아이템 조회
   */
  public getItemById(id: string): PublishQueueItem | undefined {
    const items = this.getItems();
    return items.find((item) => item.id === id);
  }

  /**
   * PENDING 상태인 아이템 목록만 조회 (발행기 연동 전 확인용)
   */
  public getPendingItems(): PublishQueueItem[] {
    return this.getItems().filter((item) => item.status === "PENDING");
  }

  /**
   * 큐 초기화 (테스트 전용)
   */
  public clear(): void {
    this.ensureQueueStore();
    fs.writeFileSync(this.queueFilePath, JSON.stringify([], null, 2), "utf-8");
  }
}
