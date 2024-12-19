import { setTimeout } from "timers/promises";

class Queue<T> {
    private items: T[];

    constructor() {
        this.items = [];
    }

    // Enqueue: Add an element to the end of the queue
    enqueue(element: T): void {
        this.items.push(element);
    }

    // Dequeue: Remove and return the first element from the queue
    dequeue(): T | undefined {
        return this.items.shift();
    }

    // Peek: Return the first element from the queue without removing it
    peek(): T | undefined {
        return this.items.length > 0 ? this.items[0] : undefined;
    }

    // isEmpty: Check if the queue is empty
    isEmpty(): boolean {
        return this.items.length === 0;
    }

    // size: Return the number of elements in the queue
    size(): number {
        return this.items.length;
    }
}

export default class PubSub {
    
    private list: Queue<string> = new Queue<string>();
    private callback: any;
    private running: boolean = false;

    public publish(data: any) {

        this.list.enqueue(data);
        console.log("published");
        if (this.running) return; 

        this.monitorList();
        console.log('restared queue');

    }

    public subscribe(callback: (data: any) => void) {
        this.callback = callback;
        console.log("subscribed");

    }

    private async  monitorList() {
        // Check if the list is non-empty initially
        this.running = true;
        while (this.list.peek() && this.callback) {
            await setTimeout(1000);
            await this.callback(this.list.peek());
            this.list.dequeue();
        }
        this.running = false;
    }
}
