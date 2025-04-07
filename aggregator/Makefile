CC = gcc
CFLAGS = -Wall -Wextra -std=c11 -O2 -g

# Add security flags for potential enclave compatibility
SECURITY_FLAGS = -fstack-protector-all -D_FORTIFY_SOURCE=2 -Wformat -Wformat-security

# Source files
SRCS = aggregator.c bigint_ops.c main.c
OBJS = $(SRCS:.c=.o)
TARGET = aggregator_demo
BUILD_DIR = build

# Libraries
LIBS = -lm

.PHONY: all clean

all: $(BUILD_DIR) $(BUILD_DIR)/$(TARGET)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) $(SECURITY_FLAGS) -o $@ $^ $(LIBS)
	@echo "Executable created in $(BUILD_DIR) folder"
	@rm -f $(OBJS)

%.o: %.c
	$(CC) $(CFLAGS) $(SECURITY_FLAGS) -c $< -o $@

clean:
	rm -f $(OBJS)
	rm -rf $(BUILD_DIR)