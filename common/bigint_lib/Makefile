# Compiler and flags
CC = gcc
CFLAGS = -Wall -Wextra -g -I/opt/homebrew/include # Include path for libtommath
LDFLAGS = -L/opt/homebrew/lib # Library path for libtommath
LIBS = -ltommath # Link against libtommath

# Source and object files
SRC = bigint.c
OBJ = $(SRC:.c=.o)

# Default target
all: $(OBJ)

# Rule to compile .c to .o
%.o: %.c bigint.h
	$(CC) $(CFLAGS) -c $< -o $@ $(LDFLAGS) $(LIBS)

# Clean target
clean:
	rm -f $(OBJ)

.PHONY: all clean