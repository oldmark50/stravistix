/**
 *   StravistiX is responsible of linking processors with modfiers and user settings/health data
 */
function StravistiX(userSettings, appResources) {

    this.userSettings_ = userSettings;
    this.appResources_ = appResources;
    this.extensionId_ = this.appResources_.extensionId;
    this.vacuumProcessor_ = new VacuumProcessor();
    this.activityProcessor_ = new ActivityProcessor(this.vacuumProcessor_, this.userSettings_.userHrrZones, this.userSettings_.zones);
    this.athleteId_ = this.vacuumProcessor_.getAthleteId();
    this.athleteName_ = this.vacuumProcessor_.getAthleteName();
    this.athleteIdAuthorOfActivity_ = this.vacuumProcessor_.getAthleteIdAuthorOfActivity();
    this.isPremium_ = this.vacuumProcessor_.getPremiumStatus();
    this.isPro_ = this.vacuumProcessor_.getProStatus();
    this.activityId_ = this.vacuumProcessor_.getActivityId();

    // Make the work...
    this.init_();
}

/**
 *   Static vars
 */
StravistiX.getFromStorageMethod = 'getFromStorage';
StravistiX.setToStorageMethod = 'setToStorage';
StravistiX.defaultIntervalTimeMillis = 750;

/**
 * Define prototype
 */
StravistiX.prototype = {

    init_: function() {

        // Redirect app.strava.com/* to www.strava.com/*
        if (this.handleForwardToWWW_()) {
            return; // Skip rest of init to be compliant with www.strava.com/* on next reload
        }

        // Handle some tasks to od when update occurs
        if (this.userSettings_.extensionHasJustUpdated || env.forceUpdated) {
            this.handleExtensionHasJustUpdated_();
        }

        if (env.preview) {
            this.handlePreviewRibbon_();
        }

        if (this.userSettings_.localStorageMustBeCleared) {
            localStorage.clear();
            Helper.setToStorage(this.extensionId_, StorageManager.storageSyncType, 'localStorageMustBeCleared', false, function(response) {
                console.log('localStorageMustBeCleared is now ' + response.data.localStorageMustBeCleared);
            });
        }

        // Common
        this.handleMenu_();
        this.handleRemoteLinks_();
        this.handleWindyTyModifier_();
        this.handleActivityScrolling_();
        this.handleDefaultLeaderboardFilter_();
        this.handleSegmentRankPercentage_();
        this.handleActivityGoogleMapType_();
        this.handleHidePremium_();
        this.handleHideFeed_();
        this.handleDisplayFlyByFeedModifier_();

        // Bike
        this.handleExtendedActivityData_();
        this.handleExtendedSegmentEffortData_();
        this.handleNearbySegments_();
        this.handleActivityBikeOdo_();
        this.handleActivitySegmentTimeComparison_();
        this.handleActivityBestSplits_();

        // Run
        this.handleRunningGradeAdjustedPace_();
        this.handleRunningHeartRate_();
        this.handleRunningCadence_();

        // All activities
        this.handleActivityQRCodeDisplay_();

        this.handleVirtualPartner_();

        this.handleAthletesStats();
        this.handleActivitiesSummary();

        // Must be done at the end
        this.handleTrackTodayIncommingConnection_();
        this.handleGoogleMapsComeBackModifier();


    },

    /**
     *
     */
    handleForwardToWWW_: function() {

        if (_.isEqual(window.location.hostname, 'app.strava.com')) {
            var forwardUrl = window.location.protocol + "//www.strava.com" + window.location.pathname;
            window.location.href = forwardUrl;
            return true;
        }
        return false;
    },

    /**
     *
     */
    handleExtensionHasJustUpdated_: function() {

        // Clear localstorage
        // Especially for activies data stored in cache
        console.log("ExtensionHasJustUpdated, localstorage clear");
        localStorage.clear();

        if (!window.location.pathname.match(/^\/dashboard/)) {
            return;
        }

        // Display ribbon update message
        this.handleUpdatePopup_();

        // Send update info to ga
        var updatedToEvent = {
            categorie: 'Exploitation',
            action: 'updatedVersion',
            name: this.appResources_.extVersion
        };

        _spTrack('send', 'event', updatedToEvent.categorie, updatedToEvent.action, updatedToEvent.name);

        // Now mark extension "just updated" to false...
        Helper.setToStorage(this.extensionId_, StorageManager.storageSyncType, 'extensionHasJustUpdated', false, function(response) {});
    },

    /**
     *
     */
    handleUpdatePopup_: function() {

        var updateMessageObj = {
            title: 'StravistiX updated/installed to <strong>v' + this.appResources_.extVersionName + '</strong>',
            hotFixes: [
                
            ],
            features: [
                'Added climb, flat & downhill distance for cyclists in extended stats (grade panel)',
                'Added average W/Kg in power extended stats',
                'Added option to get running cadence graph automatically enabled in running activity. Can be disabled in option here: <a href="chrome-extension://' + this.appResources_.extensionId + '/options/app/index.html#/commonSettings?searchText=Enable%20Cadence%20graph" target="_blank">here</a>',
            ],
            fixes: [
                'Fixed performance issues on segment time comparison. The feature has been re-enabled by default. This can be disabled here: <a href="chrome-extension://' + this.appResources_.extensionId + '/options/app/index.html#/commonSettings?searchText=Enabled%20segment%20time" target="_blank">here</a>',
                'Fixed "W/KG" computations: bike weight has been removed from "KG". Only rider weight is considered.',
                'Fixed Ascent speed stats VAM mismatch with strava. Note that sscent speed stats are no longer displayed on segment efforts stats',
                'Fixed Weighted power all same on efforts stats. Only cyclists having a power meter were touched by this bug',
            ],
            upcommingFixes: [],
            upcommingFeatures: [
                'Mute "not enough engaged" cycling or running activities in dashboard (e.g Hide cycling activities under X km). Done => In testing',
                'Year progression improvement: Be able to get a "zoom" for the last 30 day. Done => In testing',
                'New Input/Output fitness extended stats panel & Human Performance Modeling graphs. Brainstorm with me <a href="https://docs.google.com/spreadsheets/d/1tRE9EaW1MPUXbkDm9qv06isCYIuSoP5V8MzVtz-OVY0/edit#gid=0" target="_blank">on this google sheet</a>',
                '3D display of an activity ?! I\'ve skills in video games development. Looking to do something clean with WebGL ;)',
                'And more suprises... stay tunned via <a target="_blank" href="https://twitter.com/champagnethomas">my twitter</a>!',
            ]
        };

        var message = '';

        // message += '<div style="background: #eee; padding: 10px;">';
        // message += '<h3><strong>At a glance...</strong></h3>';
        // message += '<h3>- New data: Avg W/KG, Climb + flat + downhill distance.</h3>';
        // message += '<h3>- Segment time comparison come back. Performance issue fixed !</h3>';
        // message += '<h3>- Sticky bugs fixed :)</h3>';
        // message += '</div>';

        if (!_.isEmpty(updateMessageObj.hotFixes)) {
            message += '<h4><strong>HOTFIXES ' + this.appResources_.extVersion + ':</strong></h4>';
            _.each(updateMessageObj.hotFixes, function(hotFix) {
                message += '<h5>- ' + hotFix + '</h5>';
            });
        };

        var baseVersion = this.appResources_.extVersion.split('.');
        baseVersion = baseVersion[0] + '.' + baseVersion[1] + '.x';

        if (!_.isEmpty(updateMessageObj.features)) {
            message += '<h4><strong>NEW in ' + baseVersion + ':</strong></h4>';
            _.each(updateMessageObj.features, function(feature) {
                message += '<h5>- ' + feature + '</h5>';
            });
        };

        if (!_.isEmpty(updateMessageObj.fixes)) {
            message += '<h4><strong>FIXED in ' + baseVersion + ':</strong></h4>';
            _.each(updateMessageObj.fixes, function(fix) {
                message += '<h5>- ' + fix + '</h5>';
            });
        };

        if (!_.isEmpty(updateMessageObj.upcommingFixes)) {
            message += '<h4><strong>Upcomming Fixes:</strong></h4>';
            _.each(updateMessageObj.upcommingFixes, function(upcommingFixes) {
                message += '<h5>- ' + upcommingFixes + '</h5>';
            });
        };

        if (!_.isEmpty(updateMessageObj.upcommingFeatures)) {
            message += '<h4><strong>Upcomming Features:</strong></h4>';
            _.each(updateMessageObj.upcommingFeatures, function(upcommingFeatures) {
                message += '<h5>- ' + upcommingFeatures + '</h5>';
            });
        };

        // Donate button
        message += '<a style="font-size: 16px;" class="button btn-block btn-primary" target="_blank" id="extendedStatsButton" href="' + this.appResources_.settingsLink + '#/donate">';
        message += '<strong>Donate to help this project to grow up, Thanks :)</strong>';
        message += '</a>';

        $.fancybox('<h2>' + updateMessageObj.title + '</h2>' + message);
    },

    /**
     *
     */
    handleAthletesStats: function() {

        // If we are not on the athletes page then return...
        if (!window.location.pathname.match(new RegExp("/athletes/" + this.athleteId_ + "$", "g"))) {
            return;
        }

        if (env.debugMode) console.log("Execute handleAthletesStats()");

        var athleteStatsModifier = new AthleteStatsModifier(this.appResources_);
        athleteStatsModifier.modify();
    },

    handleActivitiesSummary: function() {
        // If we are not on the athletes page then return...
        if (!window.location.pathname.match(new RegExp("/athletes/" + this.athleteId_ + "$", "g"))) {
            return;
        }

        if (env.debugMode) console.log("Execute handleActivitiesSummary()");

        var activitiesSummaryModifier = new ActivitiesSummaryModifier();
        activitiesSummaryModifier.modify();
    },

    /**
     *
     */
    handlePreviewRibbon_: function() {
        var globalStyle = 'background-color: #FFF200; color: rgb(84, 84, 84); font-size: 12px; padding: 5px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; text-align: center;';
        var html = '<div id="updateRibbon" style="' + globalStyle + '"><strong>WARNING</strong> You are running a preview of <strong>StravistiX</strong>, to remove it, open a new tab and type <strong>chrome://extensions</strong></div>';
        $('body').before(html);
    },

    /**
     *
     */
    handleMenu_: function() {

        if (env.debugMode) console.log("Execute handleMenu_()");

        var menuModifier = new MenuModifier(this.athleteId_, this.userSettings_.highLightStravistiXFeature, this.appResources_);
        menuModifier.modify();
    },

    /**
     *
     */
    handleRemoteLinks_: function() {

        // If we are not on a segment or activity page then return...
        if (!window.location.pathname.match(/^\/segments\/(\d+)$/) && !window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (!this.userSettings_.remoteLinks) {
            return;
        }

        if (env.debugMode) console.log("Execute handleRemoteLinks_()");

        this.remoteLinksModifier = new RemoteLinksModifier(this.userSettings_.highLightStravistiXFeature, this.appResources_, (this.athleteIdAuthorOfActivity_ === this.athleteId_));
        this.remoteLinksModifier.modify();
    },

    handleWindyTyModifier_: function() {

        // If we are not on a segment or activity page then return...
        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (!window.pageView) {
            return;
        }

        // Avoid running Extended data at the moment
        if (window.pageView.activity().get('type') != "Ride") {
            return;
        }

        // If home trainer skip (it will use gps data to locate weather data)
        if (window.pageView.activity().get('trainer')) {
            return;
        }

        if (env.debugMode) console.log("Execute handleWindyTyModifier_()");

        var windyTyModifier = new WindyTyModifier(this.activityId_, this.appResources_, this.userSettings_);
        windyTyModifier.modify();
    },


    /**
     *
     */
    handleActivityScrolling_: function() {

        if (!this.userSettings_.feedAutoScroll) {
            return;
        }

        if (env.debugMode) console.log("Execute handleActivityScrolling_()");

        var activityScrollingModifier = new ActivityScrollingModifier();
        activityScrollingModifier.modify();
    },

    /**
     *
     */
    handleDefaultLeaderboardFilter_: function() {

        // If we are not on a segment or activity page then return...
        if (!window.location.pathname.match(/^\/segments\/(\d+)$/) && !window.location.pathname.match(/^\/activities/)) {
            return;
        }

        // Kick out if we are not on SegmentLeaderboardView
        try {
            eval('Strava.Labs.Activities.SegmentLeaderboardView');
        } catch (err) {
            if (env.debugMode) console.log('Kick out no Strava.Labs.Activities.SegmentLeaderboardView available');
            return;
        }

        if (env.debugMode) console.log("Execute handleDefaultLeaderboardFilter_()");

        var defaultLeaderboardFilterModifier = new DefaultLeaderboardFilterModifier(this.userSettings_.defaultLeaderboardFilter);
        defaultLeaderboardFilterModifier.modify();
    },

    /**
     *
     */
    handleSegmentRankPercentage_: function() {

        if (!this.userSettings_.displaySegmentRankPercentage) {
            return;
        }

        // If we are not on a segment page then return...
        if (!window.location.pathname.match(/^\/segments\/(\d+)$/)) {
            return;
        }

        if (env.debugMode) console.log("Execute handleSegmentRankPercentage_()");

        var segmentRankPercentage = new SegmentRankPercentageModifier();
        segmentRankPercentage.modify();
    },

    /**
     *
     */
    handleActivityGoogleMapType_: function() {

        // Test where are on an activity...
        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (env.debugMode) console.log("Execute handleActivityGoogleMapType_()");

        var activityGoogleMapTypeModifier = new ActivityGoogleMapTypeModifier(this.userSettings_.activityGoogleMapType);
        activityGoogleMapTypeModifier.modify();
    },

    /**
     *
     */
    handleHidePremium_: function() {

        // Eject premium users of this "Hiding" feature
        // Even if they checked "ON" the hide premium option
        if (this.isPremium_) {
            return;
        }

        if (!this.userSettings_.hidePremiumFeatures) {
            return;
        }

        if (env.debugMode) console.log("Execute handleHidePremium_()");

        var hidePremiumModifier = new HidePremiumModifier();
        hidePremiumModifier.modify();
    },

    handleHideFeed_: function() {

        // Test if where are on dashboard page
        if (!window.location.pathname.match(/^\/dashboard/)) {
            return;
        }

        if (env.debugMode) console.log("Execute handleHideFeed_()");

        if (!this.userSettings_.feedHideChallenges && !this.userSettings_.feedHideCreatedRoutes) {
            return;
        }

        var hideFeedModifier = new HideFeedModifier(this.userSettings_.feedHideChallenges, this.userSettings_.feedHideCreatedRoutes);
        hideFeedModifier.modify();
    },

    handleDisplayFlyByFeedModifier_: function() {

        // Test if where are on dashboard page
        if (!window.location.pathname.match(/^\/dashboard/)) {
            return;
        }

        if (env.debugMode) console.log("Execute handleDisplayFlyByFeedModifier_()");

        var displayFlyByFeedModifier = new DisplayFlyByFeedModifier();
        displayFlyByFeedModifier.modify();
    },

    /**
     *
     */
    handleExtendedActivityData_: function() {

        if (_.isUndefined(window.pageView)) {
            return;
        }

        var activityType = pageView.activity().get('type');

        // Skip manual activities
        if (activityType === 'Manual') {
            return;
        }

        if (env.debugMode) console.log("Execute handleExtendedData_()");

        var basicInfos = {
            activityName: this.vacuumProcessor_.getActivityName(),
            activityTime: this.vacuumProcessor_.getActivityTime()
        }

        var extendedDataModifier = null;

        switch (activityType) {
            case 'Ride':
                extendedDataModifier = new CyclingExtendedDataModifier(
                    this.activityProcessor_,
                    this.activityId_,
                    activityType,
                    this.appResources_,
                    this.userSettings_,
                    this.athleteId_,
                    this.athleteIdAuthorOfActivity_,
                    basicInfos,
                    AbstractExtendedDataModifier.TYPE_ACTIVITY);
                break;
            case 'Run':
                extendedDataModifier = new RunningExtendedDataModifier(
                    this.activityProcessor_,
                    this.activityId_,
                    activityType,
                    this.appResources_,
                    this.userSettings_,
                    this.athleteId_,
                    this.athleteIdAuthorOfActivity_,
                    basicInfos,
                    AbstractExtendedDataModifier.TYPE_ACTIVITY);
                break;
            default:
                // extendedDataModifier = new GenericExtendedDataModifier(analysisData, this.appResources_, this.userSettings_, this.athleteId_, this.athleteIdAuthorOfActivity_); // DELAYED_FOR_TESTING
                // var html = '<p style="padding: 10px;background: #FFF0A0;font-size: 12px;color: rgb(103, 103, 103);">StravistiX don\'t support <strong>Extended Data Features</strong> for this type of activity at the moment. Feature will be available in version 0.6.x. Working hard! Please wait... ;).</br></br>Stay tunned via <a href="https://twitter.com/champagnethomas">@champagnethomas</a></p>';
                // $('.inline-stats.section').parent().children().last().after(html);
                break;
        }

        // Send opened activity type to ga for stats
        var updatedToEvent = {
            categorie: 'Analyse',
            action: 'openedActivityType',
            name: activityType
        };

        _spTrack('send', 'event', updatedToEvent.categorie, updatedToEvent.action, updatedToEvent.name);
    },

    handleExtendedSegmentEffortData_: function() {

        if (_.isUndefined(window.pageView)) {
            return;
        }

        if (!Strava.Labs) {
            return;
        }

        var activityType = pageView.activity().get('type');

        // Skip manual activities
        if (activityType === 'Manual') {
            return;
        }

        this.activityProcessor_.setActivityType(activityType);

        var view = Strava.Labs.Activities.SegmentLeaderboardView; // Strava.Labs.Activities.SegmentEffortDetailView

        if (activityType === ('Run' || 'Hike' || 'Walk')) {
            view = Strava.Labs.Activities.SegmentEffortDetailView;
        }

        if (!view) {
            return;
        }

        var functionRender = view.prototype.render;

        var self = this;

        view.prototype.render = function() {

            var r = functionRender.apply(this, Array.prototype.slice.call(arguments));

            var basicInfos = {
                activityName: self.vacuumProcessor_.getActivityName(),
                activityTime: self.vacuumProcessor_.getActivityTime()
            }

            var extendedDataModifier = null;

            switch (activityType) {
                case 'Ride':
                    extendedDataModifier = new CyclingExtendedDataModifier(
                        self.activityProcessor_,
                        self.activityId_,
                        activityType,
                        self.appResources_,
                        self.userSettings_,
                        self.athleteId_,
                        self.athleteIdAuthorOfActivity_,
                        basicInfos,
                        AbstractExtendedDataModifier.TYPE_SEGMENT);
                    break;
                case 'Run':
                    extendedDataModifier = new RunningExtendedDataModifier(
                        self.activityProcessor_,
                        self.activityId_,
                        activityType,
                        self.appResources_,
                        self.userSettings_,
                        self.athleteId_,
                        self.athleteIdAuthorOfActivity_,
                        basicInfos,
                        AbstractExtendedDataModifier.TYPE_SEGMENT);
                    break;
                default:
                    break;
            }
            return r;
        };
    },

    /**
     *
     */
    handleNearbySegments_: function() {

        if (!this.userSettings_.displayNearbySegments) {
            return;
        }

        // If we are not on a segment page then return...
        var segmentData = window.location.pathname.match(/^\/segments\/(\d+)$/);
        if (_.isNull(segmentData)) {
            return;
        }

        if (env.debugMode) console.log("Execute handleNearbySegments_()");

        // Getting segment id
        var segmentId = parseInt(segmentData[1]);

        var segmentProcessor = new SegmentProcessor(this.vacuumProcessor_, segmentId);

        var arrayOfNearbySegments = segmentProcessor.getNearbySegmentsAround(function(jsonSegments) {

            if (env.debugMode) console.log(jsonSegments);

            var nearbySegmentsModifier = new NearbySegmentsModifier(jsonSegments, this.appResources_, this.userSettings_.highLightStravistiXFeature);
            nearbySegmentsModifier.modify();

        }.bind(this));
    },

    /**
     *
     */
    handleActivityBikeOdo_: function() {

        if (!this.userSettings_.displayBikeOdoInActivity) {
            return;
        }

        // Test where are on an activity...
        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (_.isUndefined(window.pageView)) {
            return;
        }

        // Avoid running Extended data at the moment
        if (window.pageView.activity().attributes.type != "Ride") {
            return;
        }

        if (env.debugMode) console.log("Execute handleActivityBikeOdo_()");

        var bikeOdoProcessor = new BikeOdoProcessor(this.vacuumProcessor_, this.athleteIdAuthorOfActivity_);
        bikeOdoProcessor.getBikeOdoOfAthlete(function(bikeOdoArray) {

            var activityBikeOdoModifier = new ActivityBikeOdoModifier(bikeOdoArray, bikeOdoProcessor.getCacheKey());
            activityBikeOdoModifier.modify();

        }.bind(this));
    },

    /**
     *
     */
    handleActivitySegmentTimeComparison_: function() {

        // Test where are on an activity...
        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (_.isUndefined(window.pageView)) {
            return;
        }

        // Only cycling is supported
        if (window.pageView.activity().attributes.type != "Ride") {
            return;
        }

        // Only for own activities
        if (this.athleteId_ != this.athleteIdAuthorOfActivity_) {
            return;
        }

        if (env.debugMode) console.log("Execute handleActivitySegmentTimeComparison_()");

        var activitySegmentTimeComparisonModifier = new ActivitySegmentTimeComparisonModifier(this.userSettings_, this.appResources_);
        activitySegmentTimeComparisonModifier.modify();
    },

    /**
     *
     */
    handleActivityBestSplits_: function() {

        if (!this.userSettings_.displayActivityBestSplits) {
            return;
        }

        // Test where are on an activity...
        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (_.isUndefined(window.pageView)) {
            return;
        }

        // Only cycling is supported
        if (window.pageView.activity().attributes.type != "Ride") {
            return;
        }

        if (env.debugMode) console.log("Execute handleActivityBestSplits_()");

        var self = this;

        // TODO Implement cache here: get stream from cache if exist
        this.vacuumProcessor_.getActivityStream(function(activityCommonStats, jsonResponse, athleteWeight, hasPowerMeter) {
            Helper.getFromStorage(self.extensionId_, StorageManager.storageSyncType, 'bestSplitsConfiguration', function(response) {
                var activityBestSplitsModifier = new ActivityBestSplitsModifier(self.activityId_, self.userSettings_, jsonResponse, hasPowerMeter, response.data, function(splitsConfiguration) {
                    Helper.setToStorage(self.extensionId_, StorageManager.storageSyncType, 'bestSplitsConfiguration', splitsConfiguration, function(response) {});
                });
                activityBestSplitsModifier.modify();
            });
        }.bind(this));
    },

    /**
     *
     */
    handleRunningGradeAdjustedPace_: function() {

        if (!this.userSettings_.activateRunningGradeAdjustedPace) {
            return;
        }

        if (_.isUndefined(window.pageView)) {
            return;
        }

        // Avoid bike activity
        if (window.pageView.activity().attributes.type != "Run") {
            return;
        }


        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (env.debugMode) console.log("Execute handleRunningGradeAdjustedPace_()");

        var runningGradeAdjustedPace = new RunningGradeAdjustedPaceModifier();
        runningGradeAdjustedPace.modify();
    },

    /**
     *
     */
    handleRunningHeartRate_: function() {

        if (!this.userSettings_.activateRunningHeartRate) {
            return;
        }

        if (_.isUndefined(window.pageView)) {
            return;
        }

        // Avoid bike activity
        if (window.pageView.activity().attributes.type != "Run") {
            return;
        }


        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (env.debugMode) console.log("Execute handleRunningHeartRate_()");

        var runningHeartRateModifier = new RunningHeartRateModifier();
        runningHeartRateModifier.modify();
    },

    handleRunningCadence_: function() {

        if (!this.userSettings_.activateRunningCadence) {
            return;
        }

        if (_.isUndefined(window.pageView)) {
            return;
        }

        // Avoid bike activity
        if (window.pageView.activity().attributes.type != "Run") {
            return;
        }


        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (env.debugMode) console.log("Execute handleRunningCadence_()");

        var runningCadenceModifier = new RunningCadenceModifier();
        runningCadenceModifier.modify();
    },

    /**
     *
     */
    handleActivityQRCodeDisplay_: function() {

        // Test where are on an activity...
        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        if (_.isUndefined(window.pageView)) {
            return;
        }

        var activityQRCodeDisplayModifier = new ActivityQRCodeDisplayModifier(this.appResources_, this.activityId_);
        activityQRCodeDisplayModifier.modify();

    },

    handleVirtualPartner_: function() {

        // Test where are on an activity...
        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        var virtualPartnerModifier = new VirtualPartnerModifier(this.activityId_);
        virtualPartnerModifier.modify();
    },

    handleGoogleMapsComeBackModifier: function() {

        if (window.location.pathname.match(/\/truncate/)) { // Skipping on activity cropping
            return;
        }

        if (!this.userSettings_.reviveGoogleMaps) {
            return;
        }

        // Test where are on an activity...
        if (!window.location.pathname.match(/^\/activities/)) {
            return;
        }

        var googleMapsComeBackModifier = new GoogleMapsComeBackModifier(this.activityId_, this.appResources_, this.userSettings_);
        googleMapsComeBackModifier.modify();
    },

    /**
     * Launch a track event once a day (is user use it once a day), to follow is account type
     */
    handleTrackTodayIncommingConnection_: function() {

        var userHasConnectSince24Hour = StorageManager.getCookie('stravistix_daily_connection_done');

        if (env.debugMode) console.log("Cookie 'stravistix_daily_connection_done' value found is: " + userHasConnectSince24Hour);

        if (_.isNull(this.athleteId_)) {
            if (env.debugMode) console.log("athleteId is empty value: " + this.athleteId_);
            return;
        }

        if (_.isNull(userHasConnectSince24Hour) || _.isEmpty(userHasConnectSince24Hour)) {

            var accountType = 'Free';
            var accountName = this.athleteName_;

            // We enter in that condition if user is premium or pro
            if (!_.isNull(this.isPremium_) && this.isPremium_ === true) {
                accountType = 'Premium';
            }

            // accountType is overridden with "pro" if that condition is true
            if (!_.isNull(this.isPro_) && this.isPro_ === true) {
                accountType = 'Pro';
            }

            var eventAction = 'DailyConnection_Account_' + accountType;

            // Push IncomingConnection to piwik
            var eventName = accountName + ' #' + this.athleteId_ + ' v' + this.appResources_.extVersion;

            if (env.debugMode) console.log("Cookie 'stravistix_daily_connection_done' not found, send track <IncomingConnection> / <" + accountType + "> / <" + eventName + ">");

            if (!env.debugMode) {
                _spTrack('send', 'event', 'DailyConnection', eventAction, eventName);
            }

            // Create cookie to avoid push during 1 day
            StorageManager.setCookie('stravistix_daily_connection_done', true, 1);

        } else {

            if (env.debugMode) console.log("Cookie 'stravistix_daily_connection_done' exist, DO NOT TRACK IncomingConnection");

        }
    }
};
