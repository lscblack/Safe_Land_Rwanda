# Safe Land Rwanda - Neighborhood Price Prediction Model

## Overview

This Jupyter Notebook contains a comprehensive machine learning solution for predicting land prices across Rwanda's neighborhoods. It helps investors identify high-potential investment areas by analyzing market trends, property characteristics, and historical transaction data.

## Project Components

### 1. **Data Engineering & Visualization**
- Load and explore property transaction data
- Analyze price distributions and market trends
- Generate correlation matrices for feature analysis
- Visualize price variations by:
  - Geographic location (Province, District)
  - Land size categories
  - Transaction types
  - Price per square meter

### 2. **Feature Engineering**
The model uses the following features:
- **Spatial**: Latitude, Longitude, Province, District
- **Property**: Land Size (m²)
- **Transaction**: Transaction Type
- **Temporal**: Year, Month of transaction

Data preprocessing includes:
- Categorical encoding (Label Encoding for provinces, districts, transaction types)
- Feature scaling (StandardScaler for numerical features)
- Train-test split (80-20 ratio)

### 3. **Model Architecture**

#### Primary Model: Gradient Boosting Regressor
```
Architecture Components:
├── Algorithm: Ensemble of Sequential Decision Trees
├── n_estimators: 200 trees
├── learning_rate: 0.1 (gradient descent step size)
├── max_depth: 8 (tree depth)
├── Optimization: Stochastic Gradient Descent
└── Loss Function: Mean Squared Error (MSE)
```

**Additional Models for Comparison:**
- Random Forest Regressor (ensemble of parallel trees)
- Linear Regression (baseline linear model)

### 4. **Performance Metrics**

The model evaluation includes:
- **R² Score**: Coefficient of Determination (% variance explained)
- **RMSE**: Root Mean Squared Error (prediction magnitude error)
- **MAE**: Mean Absolute Error (average absolute difference)
- **MAPE**: Mean Absolute Percentage Error (percentage error)

### 5. **Investment Analysis**

The notebook provides:
- **Price Premium Analysis** by province
- **Opportunity Scoring** (0-100 scale)
  - Considers: Transaction volume, price stability, growth rate
- **Market Risk Assessment**
  - Price volatility analysis
  - Region-specific risk indicators
- **Size-Price Relationships**
  - Impact of land size on pricing
  - Price per square meter analysis

### 6. **Saved Artifacts**

The model automatically saves:

**Models Directory** (`saved_models/`):
- `gradient_boosting_price_model.pkl` - Trained ML model
- `feature_scaler.pkl` - StandardScaler for feature normalization
- `label_encoders.pkl` - Encoders for categorical variables
- `feature_names.pkl` - List of model features
- `model_metadata.pkl` - Model performance and configuration

**Data Directory** (`cleaned_data/`):
- `processed_data.csv` - Full cleaned dataset
- `training_features.csv` - Training set features and target
- `test_features.csv` - Test set features, actual, and predicted prices

## Key Features

### Market Insights
- **Province-level analysis**: Average prices, volatility, transaction volume
- **Growth tracking**: Year-over-year price trends
- **Stability metrics**: Price volatility indicators
- **Size impact**: How land size affects pricing

### Investment Recommendations
The notebook identifies:
1. Top 3 investment opportunities (based on opportunity score)
2. High-volatility regions to avoid or approach cautiously
3. Market summary statistics
4. Price ranges and confidence levels

### Prediction Function
Built-in function for real-time price predictions:
```python
predict_price(
    province='Eastern',
    district='Bugesera',
    size=500,  # square meters
    latitude=-1.9441,
    longitude=30.0619,
    transaction_type='Transfer by Voluntary Sale'
)
```

Returns:
```python
{
    'predicted_price': 2451494,  # in RWF
    'confidence_level': '76.7%',
    'price_range': (2083770, 2819219),  # 85%-115% range
    'currency': 'RWF'
}
```

## Data Requirements

Your input data should include these columns:
```
provincename              - Province name (e.g., 'Eastern', 'Western')
districtname              - District name
sectorname                - Sector name
cellname                  - Cell name
village                   - Village name
upi                       - Unique parcel identifier
size                      - Land size in square meters
land_use_name_kinyarwanda - Land use category
transaction_type_name     - Type of transaction
sale_price               - Transaction price in RWF
start_date               - Transaction date (YYYY-MM-DD format)
latitude                 - Geographic latitude
longitude                - Geographic longitude
polygon_wkt              - GIS polygon (optional)
```

## How to Use

### 1. **Prepare Your Data**
- Load your property transaction data in CSV format
- Ensure all required columns are present
- Clean missing values and outliers

### 2. **Run the Notebook**
- Execute cells sequentially from top to bottom
- Each section is clearly marked with headers
- Visualizations are generated automatically

### 3. **Review Results**
- Check data visualizations (distributions, correlations)
- Review model performance metrics
- Examine investment opportunity scores
- Use predictions for decision-making

### 4. **Deploy the Model**
- Load pre-trained model and scaler from `saved_models/`
- Use `predict_price()` function for new predictions
- Integrate into web applications or dashboards

## Model Performance Notes

⚠️ **Important**: The model performance depends heavily on data quality and quantity. With synthetic sample data (100 records), performance metrics may appear suboptimal. Production models require:
- **Minimum 1,000+ historical transactions**
- **Multiple years of data** for trend analysis
- **Geographic distribution** across all regions
- **Regular retraining** as market evolves

## Notebook Sections

1. **Libraries Import** - All required packages
2. **Data Loading** - Load and explore datasets
3. **Data Visualization** - Price distributions and trends
4. **Data Engineering** - Feature preparation and scaling
5. **Model Architecture** - ML model description
6. **Model Training** - Train multiple algorithms
7. **Performance Metrics** - Evaluate and compare models
8. **Investment Insights** - Market analysis and opportunities
9. **Model Persistence** - Save trained models
10. **Predictions** - Real-time price prediction examples
11. **Conclusion** - Summary and next steps

## Dependencies

Key packages:
- **pandas**: Data manipulation
- **scikit-learn**: ML models and preprocessing
- **matplotlib/seaborn**: Visualizations
- **numpy**: Numerical operations
- **joblib**: Model persistence

## Next Steps

1. **Replace sample data** with actual transaction records
2. **Add more features**:
   - Proximity to infrastructure (schools, hospitals, roads)
   - Zoning regulations
   - Population density
   - Development activity
3. **Implement continuous learning** - Retrain quarterly
4. **Create API service** - REST endpoint for predictions
5. **Build dashboard** - Interactive map-based visualization
6. **Add validation logic** - Outlier detection and alerts

## Support & Documentation

For more information on:
- **Scikit-learn models**: https://scikit-learn.org/
- **Feature engineering**: Refer to pandas and numpy documentation
- **Model interpretability**: Use SHAP or LIME for feature importance analysis

## License

Safe Land Rwanda Project - Investment Analysis Tool

---

**Last Updated**: January 2026
**Model Version**: 1.0
**Status**: Ready for Production with Real Data
