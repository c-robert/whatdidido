Events
------
Events are used to track what has happened throughout a day. For each activity, either a new event
is created, or an existing event is updated. Each event has a timestamp to allow one to determine
at what time the event started. This timestamp is updated every time the event is updated.

There are two types of events:

1. Start event  
Start events begin a category which is intended to be tracked. This could be something
like arriving to work or getting back from lunch. It also includes any normal activity
that needs to be tracked, like working on project 'A' or project 'B'.

2. Stop event  
Stop events are used to mark the end of tracked time. This would be something like leaving
work for the day.

Categorized time is tracked by taking the difference between two subsequent events. If the
event is marked as a 'stop' event it does not denote an activity.

All events must be associated with a category.

If an event is submitted multiple times and the previously logged event is from the same
cateogory, the existing event entry is updated rather than creating a new event. This allows
tracking activities by monitoring file modifications. A listener application could be written
to monitor file modifications in certain directories and if they are modified an event could
be created. Every time a file is saved the event could be submitted.

