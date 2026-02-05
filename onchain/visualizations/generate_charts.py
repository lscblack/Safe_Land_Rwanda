from pathlib import Path

from app.services.visualization import VisualizationService

OUTPUT_DIR = Path(__file__).resolve().parent / "output"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    viz = VisualizationService()

    charts = {
        "transaction_flow.png": viz.transaction_flow_graph(),
        "upi_lock_timeline.png": viz.upi_lock_timeline(),
        "payment_progress.png": viz.payment_progress_chart(),
        "event_activity.png": viz.event_activity_graph(),
        "event_activity_timeline.png": viz.event_activity_timeline(),
    }

    for name, buffer in charts.items():
        (OUTPUT_DIR / name).write_bytes(buffer.read())

    print(f"Charts saved to {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
