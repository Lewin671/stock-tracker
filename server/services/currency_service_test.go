package services

import (
	"testing"
)

func TestCurrencyServiceFallbackRates(t *testing.T) {
	// Create service without API key
	service := &CurrencyService{
		apiKey:    "",
		rateCache: make(map[string]*CachedExchangeRate),
	}

	tests := []struct {
		name     string
		from     string
		to       string
		wantRate bool
	}{
		{
			name:     "USD to RMB",
			from:     "USD",
			to:       "RMB",
			wantRate: true,
		},
		{
			name:     "RMB to USD",
			from:     "RMB",
			to:       "USD",
			wantRate: true,
		},
		{
			name:     "CNY to USD (should normalize to RMB)",
			from:     "CNY",
			to:       "USD",
			wantRate: true,
		},
		{
			name:     "USD to CNY (should normalize to RMB)",
			from:     "USD",
			to:       "CNY",
			wantRate: true,
		},
		{
			name:     "Same currency",
			from:     "USD",
			to:       "USD",
			wantRate: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rate, err := service.GetExchangeRate(tt.from, tt.to)
			
			if tt.wantRate {
				if err != nil {
					t.Errorf("GetExchangeRate() error = %v, want no error", err)
					return
				}
				if rate <= 0 {
					t.Errorf("GetExchangeRate() rate = %v, want positive rate", rate)
				}
				t.Logf("Rate %s -> %s: %.4f", tt.from, tt.to, rate)
			}
		})
	}
}

func TestCurrencyServiceConvertAmount(t *testing.T) {
	service := &CurrencyService{
		apiKey:    "",
		rateCache: make(map[string]*CachedExchangeRate),
	}

	tests := []struct {
		name       string
		amount     float64
		from       string
		to         string
		wantResult bool
	}{
		{
			name:       "Convert 100 USD to RMB",
			amount:     100,
			from:       "USD",
			to:         "RMB",
			wantResult: true,
		},
		{
			name:       "Convert 720 RMB to USD",
			amount:     720,
			from:       "RMB",
			to:         "USD",
			wantResult: true,
		},
		{
			name:       "Convert same currency",
			amount:     100,
			from:       "USD",
			to:         "USD",
			wantResult: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.ConvertAmount(tt.amount, tt.from, tt.to)
			
			if tt.wantResult {
				if err != nil {
					t.Errorf("ConvertAmount() error = %v, want no error", err)
					return
				}
				if result <= 0 {
					t.Errorf("ConvertAmount() result = %v, want positive result", result)
				}
				t.Logf("Convert %.2f %s to %s: %.2f", tt.amount, tt.from, tt.to, result)
			}
		})
	}
}
