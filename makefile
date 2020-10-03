VERSION = $(shell head -1 < VERSION)
FILES := Rogue.js \
		Sqrt.js \
		Random.js \
		Grid.js \
		Platform.js \
		PowerTables.js \
		Globals.js \
		Dijkstra.js \
		Architect.js \
		Time.js \
		Light.js \
		Movement.js \
		Combat.js \
		Items.js \
		Monsters.js \
		RogueMain.js \
		IO.js \
		Buttons.js \
		Recordings.js \
		MainMenu.js

SOURCES := $(patsubst %, src/%, $(FILES))

PRE = src/pre.txt
POST = src/post.txt



dist/Brogue.js: $(PRE) $(SOURCES) $(POST)
	@echo Current Brogue.js version is $(VERSION)
	@echo "/*\n\
	\tThis is Brogue.js, A simple JS roguelike micro-framework for developers new to programming and or JS.\n\
	\tVersion $(VERSION), generated on $(shell date).\n\
	*/" > $@
	@cat $^ >> $@

clean:
	@echo "Removing generated JS files"
	@rm -f dist/Brogue.js

all: clean dist/Brogue.js
