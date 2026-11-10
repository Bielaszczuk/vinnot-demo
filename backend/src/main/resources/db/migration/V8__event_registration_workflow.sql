ALTER TABLE public.events
    ADD COLUMN held_attendees integer DEFAULT 0 NOT NULL,
    ADD COLUMN currency character varying(3) DEFAULT 'ARS' NOT NULL,
    ADD COLUMN registration_deadline timestamp with time zone,
    ADD COLUMN max_tickets_per_registration integer DEFAULT 6 NOT NULL,
    ADD COLUMN approval_mode character varying(20) DEFAULT 'MANUAL' NOT NULL,
    ADD COLUMN attendee_confirmation_required boolean DEFAULT true NOT NULL,
    ADD COLUMN registration_hold_minutes integer DEFAULT 1440 NOT NULL,
    ADD COLUMN payment_alias character varying(100),
    ADD COLUMN payment_qr_url character varying(500),
    ADD COLUMN payment_instructions text,
    ADD COLUMN version bigint DEFAULT 0 NOT NULL;

ALTER TABLE public.events
    ADD CONSTRAINT chk_events_held_attendees
        CHECK (held_attendees >= 0),
    ADD CONSTRAINT chk_events_capacity_usage
        CHECK (max_attendees IS NULL OR current_attendees + held_attendees <= max_attendees),
    ADD CONSTRAINT chk_events_max_tickets_per_registration
        CHECK (max_tickets_per_registration BETWEEN 1 AND 20),
    ADD CONSTRAINT chk_events_registration_hold_minutes
        CHECK (registration_hold_minutes BETWEEN 5 AND 10080),
    ADD CONSTRAINT chk_events_approval_mode
        CHECK (approval_mode IN ('MANUAL', 'AUTOMATIC'));

ALTER TABLE public.event_registrations
    DROP CONSTRAINT event_registrations_pkey;

ALTER TABLE public.event_registrations
    ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL,
    ADD COLUMN attendee_count integer DEFAULT 1 NOT NULL,
    ADD COLUMN contact_name character varying(200),
    ADD COLUMN contact_email character varying(255),
    ADD COLUMN contact_phone character varying(50),
    ADD COLUMN note text,
    ADD COLUMN companion_names jsonb DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN status character varying(50) DEFAULT 'CONFIRMED' NOT NULL,
    ADD COLUMN payment_status character varying(30) DEFAULT 'NOT_REQUIRED' NOT NULL,
    ADD COLUMN payment_method character varying(30),
    ADD COLUMN total_amount numeric(10,2),
    ADD COLUMN currency character varying(3) DEFAULT 'ARS' NOT NULL,
    ADD COLUMN organizer_note text,
    ADD COLUMN expires_at timestamp with time zone,
    ADD COLUMN approved_at timestamp with time zone,
    ADD COLUMN confirmed_at timestamp with time zone,
    ADD COLUMN rejected_at timestamp with time zone,
    ADD COLUMN cancelled_at timestamp with time zone,
    ADD COLUMN updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ADD COLUMN version bigint DEFAULT 0 NOT NULL;

UPDATE public.event_registrations
SET confirmed_at = created_at
WHERE confirmed_at IS NULL;

ALTER TABLE public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
    ADD CONSTRAINT chk_event_registrations_attendee_count
        CHECK (attendee_count BETWEEN 1 AND 20),
    ADD CONSTRAINT chk_event_registrations_status
        CHECK (status IN (
            'REQUESTED',
            'AWAITING_PAYMENT',
            'AWAITING_ATTENDEE_CONFIRMATION',
            'CONFIRMED',
            'WAITLISTED',
            'REJECTED',
            'CANCELLED',
            'EXPIRED'
        )),
    ADD CONSTRAINT chk_event_registrations_payment_status
        CHECK (payment_status IN (
            'NOT_REQUIRED',
            'PENDING',
            'REPORTED',
            'APPROVED',
            'REJECTED',
            'PAY_AT_VENUE',
            'REFUNDED'
        )),
    ADD CONSTRAINT chk_event_registrations_payment_method
        CHECK (payment_method IS NULL OR payment_method IN (
            'FREE',
            'TRANSFER',
            'QR',
            'CASH',
            'MERCADO_PAGO'
        ));

CREATE INDEX idx_events_public_window
    ON public.events (status, end_date, start_date);

CREATE INDEX idx_event_registrations_event_status
    ON public.event_registrations (event_id, status, created_at);

CREATE UNIQUE INDEX uk_event_registrations_active_user
    ON public.event_registrations (event_id, user_id)
    WHERE status IN (
        'REQUESTED',
        'AWAITING_PAYMENT',
        'AWAITING_ATTENDEE_CONFIRMATION',
        'CONFIRMED',
        'WAITLISTED'
    );

CREATE INDEX idx_event_registrations_user_status
    ON public.event_registrations (user_id, status, created_at);

CREATE INDEX idx_event_registrations_expiry
    ON public.event_registrations (expires_at)
    WHERE expires_at IS NOT NULL
      AND status IN ('AWAITING_PAYMENT', 'AWAITING_ATTENDEE_CONFIRMATION');
