package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
)

type ParcelRequest struct {
	UPI     string `json:"upi" example:"1/02/04/01/2795"`
	OwnerID string `json:"owner_id" example:"1200480002578150"`
}

type UPIsRequest struct {
	OwnerID string `json:"owner_id" example:"1200480002578150"`
	IDType  string `json:"id_type" example:"NID"`
}

type AuthTokenRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// GetParcelInformation get parcel information by UPI
// @Description Get parcel information by providing UPI
// @Summary Get parcel by UPI
// @Tags External Services
// @Accept json
// @Produce json
// @Param request body ParcelRequest true "Parcel Request"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/external/parcel [post]
func GetParcelInformation(c *fiber.Ctx) error {
	req := new(ParcelRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	if req.UPI == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "UPI is required",
		})
	}

	endpoint := os.Getenv("PARCEL_INFORMATION_IP_ADDRESS")
	url := endpoint + "?upi=" + req.UPI

	resp, err := http.Get(url)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to fetch parcel information: " + err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to read response: " + err.Error(),
		})
	}

	return c.Status(resp.StatusCode).Send(body)
}

// GetUPIsByOwnerID get all UPIs for an owner - requires authentication token
// @Description Get all UPIs for an owner. Authenticates with external service and retrieves UPIs
// @Summary Get UPIs by owner ID
// @Tags External Services
// @Accept json
// @Produce json
// @Param request body UPIsRequest true "UPIs Request"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/external/upis [post]
func GetUPIsByOwnerID(c *fiber.Ctx) error {
	req := new(UPIsRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	if req.OwnerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "owner_id is required",
		})
	}

	if req.IDType == "" {
		req.IDType = "NID"
	}

	// Step 1: Get authentication token
	authTokenURL := os.Getenv("GET_AUTH_TOKEN")
	authTokenUsername := os.Getenv("GET_AUTH_TOKEN_USERNAME")
	authTokenPassword := os.Getenv("GET_AUTH_TOKEN_PASSWORD")

	authPayload := AuthTokenRequest{
		Username: authTokenUsername,
		Password: authTokenPassword,
	}

	authPayloadJSON, err := json.Marshal(authPayload)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to marshal auth payload: " + err.Error(),
		})
	}

	authResp, err := http.Post(
		authTokenURL,
		"application/json",
		bytes.NewBuffer(authPayloadJSON),
	)

	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to authenticate with external service: " + err.Error(),
		})
	}
	defer authResp.Body.Close()

	authBody, err := io.ReadAll(authResp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to read auth response: " + err.Error(),
		})
	}

	authToken := string(authBody)
	if authToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to obtain authentication token",
		})
	}

	// Step 2: Use token to get UPIs
	getUPIsURL := os.Getenv("GET_UPIS_BY_ID")
	upiBuildURL := getUPIsURL + "/?idno=" + req.OwnerID + "&idtypeid=" + req.IDType

	client := &http.Client{}
	upisReq, err := http.NewRequest("GET", upiBuildURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to create UPI request: " + err.Error(),
		})
	}

	upisReq.Header.Set("Authorization", "Bearer "+authToken)

	upisResp, err := client.Do(upisReq)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to fetch UPIs: " + err.Error(),
		})
	}
	defer upisResp.Body.Close()

	upisBody, err := io.ReadAll(upisResp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to read UPIs response: " + err.Error(),
		})
	}

	return c.Status(upisResp.StatusCode).Send(upisBody)
}

// GetTaxArrears get tax arrears by UPI
// @Description Get tax arrears information for a parcel by UPI
// @Summary Get tax arrears by UPI
// @Tags External Services
// @Accept json
// @Produce json
// @Param upi query string true "Unique Parcel Identifier"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/external/tax-arrears [get]
func GetTaxArrears(c *fiber.Ctx) error {
	upi := c.Query("upi")
	if upi == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "UPI is required",
		})
	}

	endpoint := os.Getenv("TAX_ARREARS_ENDPOINT")
	url := endpoint + "?upi=" + upi

	resp, err := http.Get(url)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to fetch tax arrears: " + err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to read response: " + err.Error(),
		})
	}

	return c.Status(resp.StatusCode).Send(body)
}

// GetTitleByUPI get e-title by UPI
// @Description Get e-title document by UPI and language (returns PDF file)
// @Summary Get title by UPI
// @Tags External Services
// @Accept json
// @Produce application/pdf
// @Param upi query string true "Unique Parcel Identifier"
// @Param language query string true "Language (english, french,kinyarwanda etc)"
// @Success 200 {file} file "PDF file"
// @Security BearerAuth
// @Router /api/external/title [get]
func GetTitleByUPI(c *fiber.Ctx) error {
	upi := c.Query("upi")
	language := c.Query("language")

	if upi == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "UPI is required",
		})
	}

	if language == "" {
		language = "english"
	}

	endpoint := os.Getenv("TITLE_DOWNLOAD")
	url := endpoint + "/title?upi=" + upi + "&language=" + language

	resp, err := http.Get(url)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to fetch title: " + err.Error(),
		})
	}
	defer resp.Body.Close()

	// Read the response body first
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to read response: " + err.Error(),
		})
	}

	// Set the correct content type for PDF
	c.Set("Content-Type", "application/pdf")

	// Copy Content-Disposition if present (for filename)
	if contentDisposition := resp.Header.Get("Content-Disposition"); contentDisposition != "" {
		c.Set("Content-Disposition", contentDisposition)
	}

	// Return the PDF file with the same status code
	return c.Status(resp.StatusCode).Send(body)
}

// GetPlotShape get plot shape/GIS data by UPI
// @Description Get plot shape GIS data by UPI
// @Summary Get plot shape by UPI
// @Tags External Services
// @Accept json
// @Produce json
// @Param upi query string true "Unique Parcel Identifier"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/external/gis-extract [get]
func GetPlotShape(c *fiber.Ctx) error {
	upi := c.Query("upi")
	if upi == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "UPI is required",
		})
	}

	endpoint := os.Getenv("TITLE_DOWNLOAD")
	url := endpoint + "/gis_extract?upi=" + upi

	resp, err := http.Get(url)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to fetch plot shape: " + err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to read response: " + err.Error(),
		})
	}

	return c.Status(resp.StatusCode).Send(body)
}
