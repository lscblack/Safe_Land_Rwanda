import io
from datetime import datetime
from typing import List

import matplotlib.pyplot as plt

try:
    from app.services.blockchain import BlockchainService
except ModuleNotFoundError:  # pragma: no cover
    from .blockchain import BlockchainService


class VisualizationService:
    def __init__(self) -> None:
        self.blockchain = BlockchainService()

    def _render_png(self) -> io.BytesIO:
        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png")
        plt.close()
        buf.seek(0)
        return buf

    def transaction_flow_graph(self) -> io.BytesIO:
        logs = self.blockchain.fetch_event_logs("TransactionCreated")
        labels = [log["args"]["tra_id"] for log in logs]
        amounts = [log["args"]["agreed_amount"] for log in logs]

        plt.figure(figsize=(10, 4))
        plt.title("Transaction Flow (Agreed Amounts)")
        if labels:
            plt.bar(labels, amounts, color="#3b82f6")
            plt.xticks(rotation=45, ha="right")
        else:
            plt.text(0.5, 0.5, "No data", ha="center", va="center")
        plt.ylabel("Agreed Amount")
        return self._render_png()

    def upi_lock_timeline(self) -> io.BytesIO:
        created_logs = self.blockchain.fetch_event_logs("TransactionCreated")
        unlock_logs = self.blockchain.fetch_event_logs("UnlockAction")

        timeline = []
        for log in created_logs:
            timeline.append((log["args"]["upi"], log["blockNumber"], "locked"))
        for log in unlock_logs:
            timeline.append((log["args"]["upi"], log["blockNumber"], "unlocked"))

        timeline.sort(key=lambda x: x[1])
        labels = [f"{t[0]}-{t[2]}" for t in timeline]
        blocks = [t[1] for t in timeline]

        plt.figure(figsize=(10, 4))
        plt.title("UPI Lock/Unlock Timeline")
        if labels:
            plt.plot(blocks, range(len(blocks)), marker="o", color="#10b981")
            plt.yticks(range(len(labels)), labels)
        else:
            plt.text(0.5, 0.5, "No data", ha="center", va="center")
        plt.xlabel("Block Number")
        return self._render_png()

    def payment_progress_chart(self) -> io.BytesIO:
        logs = self.blockchain.fetch_event_logs("PaymentUpdated")
        labels = [log["args"]["tra_id"] for log in logs]
        amounts = [log["args"]["amount_payed"] for log in logs]

        plt.figure(figsize=(10, 4))
        plt.title("Payment Progress")
        if labels:
            plt.plot(labels, amounts, marker="o", color="#f59e0b")
            plt.xticks(rotation=45, ha="right")
        else:
            plt.text(0.5, 0.5, "No data", ha="center", va="center")
        plt.ylabel("Amount Paid")
        return self._render_png()

    def event_activity_graph(self) -> io.BytesIO:
        event_names = ["TransactionCreated", "PaymentUpdated", "StatusChanged", "UnlockAction"]
        counts = []
        for event_name in event_names:
            logs = self.blockchain.fetch_event_logs(event_name)
            counts.append(len(logs))

        plt.figure(figsize=(6, 4))
        plt.title("Contract Event Activity")
        plt.bar(event_names, counts, color="#6366f1")
        plt.ylabel("Event Count")
        plt.xticks(rotation=45, ha="right")
        return self._render_png()

    def event_activity_timeline(self) -> io.BytesIO:
        logs = []
        for event_name in ["TransactionCreated", "PaymentUpdated", "StatusChanged", "UnlockAction"]:
            logs.extend(self.blockchain.fetch_event_logs(event_name))

        data = [(log["blockNumber"], log["event"]) for log in logs]
        data.sort(key=lambda x: x[0])

        plt.figure(figsize=(10, 4))
        plt.title("Contract Event Activity Timeline")
        if data:
            blocks = [d[0] for d in data]
            plt.plot(blocks, range(len(blocks)), marker="o", color="#ef4444")
        else:
            plt.text(0.5, 0.5, "No data", ha="center", va="center")
        plt.xlabel("Block Number")
        return self._render_png()
