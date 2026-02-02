package handlers

import (
	"io"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
)

// GetCitizenInformation get citizen information by NID
// @Description Get citizen information from external endpoint
// @Summary Get citizen information by NID
// @Tags External Services
// @Accept json
// @Produce json
// @Param nid path string true "NID Number"
// @Success 200 {object} object// @Security BearerAuth// @Router /api/external/citizen/{nid} [get]
func GetCitizenInformation(c *fiber.Ctx) error {
	nid := c.Params("nid")
	if nid == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "NID is required",
		})
	}

	endpoint := os.Getenv("CITIZEN_INFORMATION_ENDPOINT")
	url := endpoint + "/person/" + nid

	resp, err := http.Get(url)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to fetch citizen information: " + err.Error(),
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

// GetPhoneNumbersByNID get phone numbers by NID
// @Description Get phone numbers associated with NID
// @Summary Get phone numbers by NID
// @Tags External Services
// @Accept json
// @Produce json
// @Param nid path string true "NID Number"
// @Success 200 {object} object// @Security BearerAuth// @Router /api/external/nid/{nid}/phonenumbers [get]
func GetPhoneNumbersByNID(c *fiber.Ctx) error {
	nid := c.Params("nid")
	if nid == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "NID is required",
		})
	}

	endpoint := os.Getenv("PHONE_NUMBERS_BY_NID_ENDPOINT")
	if endpoint == "" {
		endpoint = os.Getenv("PHONE_NUMBERS_BY_NID")
	}

	url := endpoint + "/nid/" + nid + "/phonenumbers"

	resp, err := http.Get(url)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to fetch phone numbers: " + err.Error(),
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

// GetNIDByPhoneNumber get NID by phone number
// @Description Get NID information by phone number
// @Summary Get NID by phone number
// @Tags External Services
// @Accept json
// @Produce json
// @Param phone path string true "Phone Number"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/external/phoneuser/{phone} [get]
func GetNIDByPhoneNumber(c *fiber.Ctx) error {
	phone := c.Params("phone")
	if phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "Phone number is required",
		})
	}

	endpoint := os.Getenv("NID_BY_PHONE_NUMBER_ENDPOINT")
	url := endpoint + "/phoneuser/" + phone

	resp, err := http.Get(url)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to fetch NID information: " + err.Error(),
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
